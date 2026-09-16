import { Action, ActionPanel, Detail, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";

import {
  createGenerationTemplateDraft,
  duplicateGenerationTemplateDraft,
  resolveGenerationTemplate,
  restoreInputValues,
  type GenerationTemplateResolution,
} from "../domain/edit-card";
import type { CardTemplate, CardTemplateDraft, FieldValues } from "../domain/template";
import {
  toMochiTemplateSnapshot,
  type MochiCard,
  type MochiClient,
  type MochiDeck,
  type MochiTemplate,
} from "../services/mochi-client";
import {
  CardGenerationContextRepository,
  type CardGenerationContext,
} from "../storage/card-generation-context-repository";
import { TemplateRepository } from "../storage/template-repository";
import { CardPreview } from "./card-preview";
import { GenerationInputForm } from "./generation-input-form";
import { TemplateForm } from "./template-form";

const templateRepository = new TemplateRepository();
const contextRepository = new CardGenerationContextRepository();

type EditCardFlowProps = {
  readonly card: MochiCard;
  readonly deck: MochiDeck;
  readonly client: MochiClient;
  readonly onCardUpdated: (card: MochiCard, template: MochiTemplate) => Promise<void> | void;
};

type PreviousSession = { readonly template: CardTemplate; readonly values: FieldValues };

export function EditCardFlow({ card, deck, client, onCardUpdated }: EditCardFlowProps) {
  const { pop } = useNavigation();
  const abortable = useRef<AbortController | undefined>(undefined);
  const [targetMochiTemplateId, setTargetMochiTemplateId] = useState(card.templateId ?? "");
  const [chosenTemplate, setChosenTemplate] = useState<CardTemplate | undefined>(undefined);
  const [chosenWarnings, setChosenWarnings] = useState<readonly string[]>([]);
  const [previousSession, setPreviousSession] = useState<PreviousSession | undefined>(undefined);
  const [templateOverrides, setTemplateOverrides] = useState<Readonly<Record<string, CardTemplate>>>({});
  const shownContextWarning = useRef<string | undefined>(undefined);
  const { data, error, isLoading } = usePromise(
    async (cardId: string) => {
      const [templates, contextLoad, mochiTemplates] = await Promise.all([
        templateRepository.list(),
        contextRepository.getOptional(cardId),
        client.listTemplates(abortable.current?.signal),
      ]);
      return {
        templates,
        context: contextLoad.context,
        contextWarning: contextLoad.warning,
        mochiTemplates,
      };
    },
    [card.id],
    { abortable }
  );

  useEffect(() => {
    if (!data?.contextWarning || shownContextWarning.current === data.contextWarning) {
      return;
    }
    shownContextWarning.current = data.contextWarning;
    void showToast({
      style: Toast.Style.Failure,
      title: "Saved Edit Inputs Unavailable",
      message: data.contextWarning,
    });
  }, [data?.contextWarning]);

  if (isLoading || !data) {
    return (
      <Detail
        isLoading={isLoading}
        navigationTitle="Edit Card"
        markdown={error ? `# Could Not Start Edit\n\n${errorMessage(error)}` : "Loading card and templates…"}
      />
    );
  }

  const templates = mergeTemplates(data.templates, templateOverrides);
  const liveTemplate = data.mochiTemplates.find((candidate) => candidate.id === targetMochiTemplateId);

  function rememberTemplate(template: CardTemplate): void {
    setTemplateOverrides((current) => ({ ...current, [template.id]: template }));
  }

  function selectGenerationTemplate(template: CardTemplate, warnings: readonly string[] = []): void {
    rememberTemplate(template);
    setChosenTemplate(template);
    setChosenWarnings(warnings);
  }

  function changeMochiTemplate(templateId: string, previous?: PreviousSession): void {
    setPreviousSession(previous);
    setChosenTemplate(undefined);
    setChosenWarnings([]);
    setTargetMochiTemplateId(templateId);
  }

  async function complete(updatedCard: MochiCard, updatedTemplate: MochiTemplate, signal: AbortSignal): Promise<void> {
    try {
      await onCardUpdated(updatedCard, updatedTemplate);
    } catch (refreshError: unknown) {
      if (!signal.aborted) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Card Updated, but View Refresh Failed",
          message: errorMessage(refreshError),
        });
      }
    }
    if (!signal.aborted) {
      pop();
    }
  }

  if (!liveTemplate) {
    return (
      <MissingMochiTemplate
        currentTemplateId={targetMochiTemplateId}
        templates={data.mochiTemplates}
        generationTemplates={templates}
        deckId={deck.id}
        onChoose={changeMochiTemplate}
      />
    );
  }

  const resolution = resolveGenerationTemplate(templates, deck.id, liveTemplate.id, data.context);
  const configuredChoice =
    chosenTemplate && chosenTemplate.deckId === deck.id && configuredMochiTemplateId(chosenTemplate) === liveTemplate.id
      ? chosenTemplate
      : undefined;
  const resolvedTemplate = configuredChoice ?? (resolution.kind === "resolved" ? resolution.template : undefined);
  if (resolvedTemplate) {
    const candidates = configuredCandidates(templates, deck.id, liveTemplate.id);
    return (
      <EditSession
        key={`${liveTemplate.id}:${resolvedTemplate.id}`}
        card={card}
        context={data.context}
        initialTemplate={resolvedTemplate}
        initialWarnings={[...(data.contextWarning ? [data.contextWarning] : []), ...chosenWarnings]}
        previousSession={previousSession}
        mochiTemplateId={liveTemplate.id}
        candidates={candidates}
        mochiTemplates={data.mochiTemplates}
        generationTemplates={templates}
        deck={deck}
        onTemplateSaved={rememberTemplate}
        onChooseGeneration={(template, previous) => {
          setPreviousSession(previous);
          selectGenerationTemplate(template);
        }}
        onChangeMochiTemplate={changeMochiTemplate}
        onCardUpdated={complete}
      />
    );
  }

  if (resolution.kind === "create") {
    const generated = createGenerationTemplateDraft(toMochiTemplateSnapshot(liveTemplate), deck);
    return (
      <TemplateForm
        repository={templateRepository}
        initialDraft={generated.draft}
        warnings={generated.warnings}
        submitTitle="Create and Continue"
        closeAfterSave={false}
        validateDraft={(draft) => editTemplateCompatibilityError(draft, deck.id, liveTemplate.id)}
        onSaved={(saved) => selectGenerationTemplate(saved, generated.warnings)}
      />
    );
  }

  if (resolution.kind === "choose" || resolution.kind === "configure" || resolution.kind === "duplicate") {
    return (
      <GenerationTemplateResolver
        resolution={resolution}
        deck={deck}
        client={client}
        mochiTemplate={liveTemplate}
        onSaved={selectGenerationTemplate}
      />
    );
  }
  throw new Error(`Unexpected edit-card resolution: ${resolution.kind}`);
}

function EditSession({
  card,
  context,
  initialTemplate,
  initialWarnings,
  previousSession,
  mochiTemplateId,
  candidates,
  mochiTemplates,
  generationTemplates,
  deck,
  onTemplateSaved,
  onChooseGeneration,
  onChangeMochiTemplate,
  onCardUpdated,
}: {
  readonly card: MochiCard;
  readonly context?: CardGenerationContext;
  readonly initialTemplate: CardTemplate;
  readonly initialWarnings: readonly string[];
  readonly previousSession?: PreviousSession;
  readonly mochiTemplateId: string;
  readonly candidates: readonly CardTemplate[];
  readonly mochiTemplates: readonly MochiTemplate[];
  readonly generationTemplates: readonly CardTemplate[];
  readonly deck: MochiDeck;
  readonly onTemplateSaved: (template: CardTemplate) => void;
  readonly onChooseGeneration: (template: CardTemplate, previous: PreviousSession) => void;
  readonly onChangeMochiTemplate: (templateId: string, previous?: PreviousSession) => void;
  readonly onCardUpdated: (card: MochiCard, template: MochiTemplate, signal: AbortSignal) => Promise<void> | void;
}) {
  const restored = restoreInputValues(initialTemplate, card, { context, previous: previousSession });
  const [template, setTemplate] = useState(initialTemplate);
  const [values, setValues] = useState<FieldValues>(restored.values);
  const [warnings, setWarnings] = useState<readonly string[]>([...initialWarnings, ...restored.warnings]);
  const [isPreviewing, setIsPreviewing] = useState(false);

  function currentSession(): PreviousSession {
    return { template, values };
  }

  function applySavedTemplate(saved: CardTemplate): void {
    onTemplateSaved(saved);
    if (saved.deckId !== deck.id || configuredMochiTemplateId(saved) !== mochiTemplateId) {
      onChangeMochiTemplate(mochiTemplateId, currentSession());
      return;
    }
    const reconciled = restoreInputValues(saved, card, {
      context: {
        generationTemplateId: saved.id,
        generationTemplateUpdatedAt: saved.updatedAt,
        mochiTemplateId,
        inputValues: values,
      },
    });
    setTemplate(saved);
    setValues(reconciled.values);
    setWarnings(reconciled.warnings);
    setIsPreviewing(false);
  }

  if (isPreviewing) {
    return (
      <CardPreview
        template={template}
        values={values}
        mode={{ kind: "update", card, onBack: () => setIsPreviewing(false), onCardUpdated }}
      />
    );
  }

  return (
    <GenerationInputForm
      key={`${template.id}:${template.updatedAt}`}
      template={template}
      initialValues={values}
      mode="update"
      warnings={warnings}
      onValuesChange={setValues}
      onGenerate={(nextValues) => {
        setValues(nextValues);
        setIsPreviewing(true);
      }}
      secondaryActions={
        <>
          <Action.Push
            title="Edit Generation Template"
            icon={Icon.Pencil}
            target={
              <TemplateForm
                repository={templateRepository}
                template={template}
                onSaved={applySavedTemplate}
                submitTitle="Save and Continue"
                allowDelete={false}
                validateDraft={(draft) => editTemplateCompatibilityError(draft, deck.id, mochiTemplateId)}
              />
            }
          />
          {candidates.length > 1 ? (
            <Action.Push
              title="Choose Generation Template"
              icon={Icon.List}
              target={
                <GenerationTemplateChooser
                  templates={candidates}
                  onChoose={(selected) => {
                    if (selected.id !== template.id) {
                      onChooseGeneration(selected, currentSession());
                    }
                  }}
                />
              }
            />
          ) : null}
          <Action.Push
            title="Change Mochi Template…"
            icon={Icon.Replace}
            target={
              <MochiTemplateChooser
                templates={mochiTemplates}
                generationTemplates={generationTemplates}
                deckId={deck.id}
                onChoose={(templateId) => {
                  if (templateId !== mochiTemplateId) {
                    onChangeMochiTemplate(templateId, currentSession());
                  }
                }}
              />
            }
          />
        </>
      }
    />
  );
}

function GenerationTemplateResolver({
  resolution,
  deck,
  client,
  mochiTemplate,
  onSaved,
}: {
  readonly resolution: Exclude<GenerationTemplateResolution, { readonly kind: "resolved" | "create" }>;
  readonly deck: MochiDeck;
  readonly client: MochiClient;
  readonly mochiTemplate: MochiTemplate;
  readonly onSaved: (template: CardTemplate) => void;
}) {
  const activeDuplicateController = useRef<AbortController | undefined>(undefined);
  const isMounted = useRef(true);
  const operationNumber = useRef(0);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      operationNumber.current += 1;
      activeDuplicateController.current?.abort(new Error("Edit flow closed"));
    };
  }, []);

  async function duplicateAndContinue(template: CardTemplate): Promise<void> {
    if (activeDuplicateController.current) {
      return;
    }
    const controller = new AbortController();
    const currentOperation = operationNumber.current + 1;
    operationNumber.current = currentOperation;
    activeDuplicateController.current = controller;
    const isCurrent = (): boolean =>
      isMounted.current && operationNumber.current === currentOperation && !controller.signal.aborted;
    try {
      const liveMochiTemplate = await client.getTemplate(mochiTemplate.id, controller.signal);
      if (!isCurrent()) {
        return;
      }
      const draft = duplicateGenerationTemplateDraft(template, deck, toMochiTemplateSnapshot(liveMochiTemplate));
      if (!isCurrent()) {
        return;
      }
      const saved = await templateRepository.create(draft);
      if (!isCurrent()) {
        return;
      }
      onSaved(saved);
    } catch (error: unknown) {
      if (isCurrent()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could Not Copy Template",
          message: errorMessage(error),
        });
      }
    } finally {
      if (activeDuplicateController.current === controller) {
        activeDuplicateController.current = undefined;
      }
    }
  }

  if (resolution.kind === "choose") {
    return <GenerationTemplateChooser templates={resolution.templates} onChoose={onSaved} closeAfterChoose={false} />;
  }

  return (
    <List
      navigationTitle={resolution.kind === "configure" ? "Configure Generation Template" : "Copy Generation Template"}
    >
      {resolution.templates.map((template) => (
        <List.Item
          key={template.id}
          icon={resolution.kind === "configure" ? Icon.Cog : Icon.Duplicate}
          title={template.name}
          subtitle={resolution.kind === "duplicate" ? template.deckName : undefined}
          accessories={
            resolution.kind === "configure" ? [{ tag: { value: "Needs Configuration", color: "orange" } }] : []
          }
          actions={
            <ActionPanel>
              {resolution.kind === "configure" ? (
                <Action.Push
                  title="Configure and Continue"
                  icon={Icon.Cog}
                  target={
                    <TemplateForm
                      repository={templateRepository}
                      template={template}
                      submitTitle="Save and Continue"
                      onSaved={onSaved}
                      allowDelete={false}
                      validateDraft={(draft) => editTemplateCompatibilityError(draft, deck.id, mochiTemplate.id)}
                    />
                  }
                />
              ) : (
                <Action
                  title="Copy and Continue"
                  icon={Icon.Duplicate}
                  onAction={() => duplicateAndContinue(template)}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function GenerationTemplateChooser({
  templates,
  onChoose,
  closeAfterChoose = true,
}: {
  readonly templates: readonly CardTemplate[];
  readonly onChoose: (template: CardTemplate) => void;
  readonly closeAfterChoose?: boolean;
}) {
  const { pop } = useNavigation();
  return (
    <List navigationTitle="Choose Generation Template" searchBarPlaceholder="Search generation templates">
      {templates.map((template) => (
        <List.Item
          key={template.id}
          icon={Icon.Snippets}
          title={template.name}
          subtitle={template.deckName}
          accessories={[{ text: `${template.fields.length} input${template.fields.length === 1 ? "" : "s"}` }]}
          actions={
            <ActionPanel>
              <Action
                title="Use Generation Template"
                icon={Icon.ArrowRight}
                onAction={() => {
                  onChoose(template);
                  if (closeAfterChoose) {
                    pop();
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function MochiTemplateChooser({
  templates,
  generationTemplates,
  deckId,
  onChoose,
}: {
  readonly templates: readonly MochiTemplate[];
  readonly generationTemplates: readonly CardTemplate[];
  readonly deckId: string;
  readonly onChoose: (templateId: string) => void;
}) {
  const { pop } = useNavigation();
  return (
    <List navigationTitle="Change Mochi Template" searchBarPlaceholder="Search Mochi templates">
      {templates.map((template) => {
        const accessory = mochiTemplateAccessory(generationTemplates, deckId, template.id);
        return (
          <List.Item
            key={template.id}
            icon={Icon.Box}
            title={template.name}
            accessories={[{ tag: accessory }]}
            actions={
              <ActionPanel>
                <Action
                  title="Use Mochi Template"
                  icon={Icon.Replace}
                  onAction={() => {
                    onChoose(template.id);
                    pop();
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function MissingMochiTemplate({
  currentTemplateId,
  templates,
  generationTemplates,
  deckId,
  onChoose,
}: {
  readonly currentTemplateId: string;
  readonly templates: readonly MochiTemplate[];
  readonly generationTemplates: readonly CardTemplate[];
  readonly deckId: string;
  readonly onChoose: (templateId: string) => void;
}) {
  return (
    <List navigationTitle="Edit Card">
      <List.EmptyView
        icon={Icon.Warning}
        title="Mochi Template Was Removed"
        description={`Template ${currentTemplateId} is unavailable. Choose another Mochi template to continue.`}
        actions={
          <ActionPanel>
            <Action.Push
              title="Change Mochi Template…"
              icon={Icon.Replace}
              target={
                <MochiTemplateChooser
                  templates={templates}
                  generationTemplates={generationTemplates}
                  deckId={deckId}
                  onChoose={onChoose}
                />
              }
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

function configuredCandidates(
  templates: readonly CardTemplate[],
  deckId: string,
  mochiTemplateId: string
): readonly CardTemplate[] {
  return templates.filter(
    (template) => template.deckId === deckId && configuredMochiTemplateId(template) === mochiTemplateId
  );
}

function configuredMochiTemplateId(template: CardTemplate): string | undefined {
  return template.output.kind === "mochi-template" && template.output.target.status === "configured"
    ? template.output.target.template.id
    : undefined;
}

function editTemplateCompatibilityError(
  template: Pick<CardTemplateDraft, "deckId" | "output">,
  deckId: string,
  mochiTemplateId: string
): string | undefined {
  if (template.deckId !== deckId) {
    return "Generation Template must stay in the card's Mochi deck.";
  }
  if (
    template.output.kind !== "mochi-template" ||
    template.output.target.status !== "configured" ||
    template.output.target.template.id !== mochiTemplateId
  ) {
    return "Generation Template must keep the selected Mochi template and configured field mappings.";
  }
  return undefined;
}

function mochiTemplateAccessory(
  templates: readonly CardTemplate[],
  deckId: string,
  mochiTemplateId: string
): { readonly value: string; readonly color?: "green" | "orange" } {
  const matching = templates.filter((template) => template.deckId === deckId);
  const configured = matching.filter((template) => configuredMochiTemplateId(template) === mochiTemplateId);
  if (configured.length === 1) {
    return { value: "Ready", color: "green" };
  }
  if (configured.length > 1) {
    return { value: `${configured.length} Generation Templates`, color: "green" };
  }
  const incomplete = matching.some(
    (template) =>
      template.output.kind === "mochi-template" &&
      template.output.target.status === "needs-configuration" &&
      template.output.target.templateId === mochiTemplateId
  );
  return incomplete ? { value: "Needs Configuration", color: "orange" } : { value: "Will Create" };
}

function mergeTemplates(
  templates: readonly CardTemplate[],
  overrides: Readonly<Record<string, CardTemplate>>
): readonly CardTemplate[] {
  const merged = new Map(templates.map((template) => [template.id, overrides[template.id] ?? template]));
  Object.values(overrides).forEach((template) => merged.set(template.id, template));
  return [...merged.values()];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}
