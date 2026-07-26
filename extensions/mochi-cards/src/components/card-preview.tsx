import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  getPreferenceValues,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";

import { deriveMochiCardName, findDuplicateCardByName, selectDuplicateCandidate } from "../domain/card-duplicates";
import {
  editMarkdown,
  generateSession,
  generationFieldTitle,
  getAiFieldErrors,
  getGeneratedAiFields,
  getMochiOutput,
  isSessionReady,
  regenerateAll,
  regenerateField,
  renderMarkdown,
  restoreGenerated,
  type GenerationProgress,
  type GeneratedSession,
  type GenerationSession,
} from "../domain/generation-session";
import { cardChangedSinceOpen, mergeUpdateFields } from "../domain/edit-card";
import type { CardTemplate, FieldValues } from "../domain/template";
import { detectTemplateDrift, refreshTemplateSnapshot } from "../domain/mochi-template";
import { cardMarkdown } from "../mochi-card-content";
import { renderRaycastMarkdown } from "../raycast-markdown";
import {
  MochiClient,
  MochiError,
  toMochiTemplateSnapshot,
  type MochiCard,
  type MochiTemplate,
} from "../services/mochi-client";
import { RaycastAiClient } from "../services/raycast-ai-client";
import { CardCacheRepository, upsertCreatedCardBestEffort } from "../storage/card-cache-repository";
import { CardGenerationContextRepository } from "../storage/card-generation-context-repository";
import { MarkdownEditor } from "./markdown-editor";
import { MochiValuesEditor } from "./mochi-values-editor";
import { SaveMarkdownForm } from "./save-markdown-form";

type CardPreviewProps = {
  readonly template: CardTemplate;
  readonly values: FieldValues;
  readonly mode:
    | { readonly kind: "create"; readonly onCardAdded: () => void }
    | {
        readonly kind: "update";
        readonly card: MochiCard;
        readonly onBack: () => void;
        readonly onCardUpdated: (card: MochiCard, template: MochiTemplate, signal: AbortSignal) => Promise<void> | void;
      };
};

type Preferences = {
  readonly mochiApiKey: string;
};

const aiClient = new RaycastAiClient();
const cardCacheRepository = new CardCacheRepository();
const contextRepository = new CardGenerationContextRepository();

export function CardPreview({ template, values, mode }: CardPreviewProps) {
  const { pop } = useNavigation();
  const [session, setSession] = useState<GenerationSession | undefined>(undefined);
  const [previewMochiTemplate, setPreviewMochiTemplate] = useState<MochiTemplate | undefined>(undefined);
  const [isWorking, setIsWorking] = useState(true);
  const [creationLog, setCreationLog] = useState<readonly string[]>([]);
  const operationNumber = useRef(0);
  const activeController = useRef<AbortController | undefined>(undefined);
  const markdown = session ? renderMarkdown(session) : "";
  const previewMarkdown =
    session && previewMochiTemplate
      ? renderMochiTemplatePreview(session, previewMochiTemplate, mode)
      : renderRaycastMarkdown(markdown);
  const creationMarkdown = creationLog.join("  \n");
  const fieldErrors = session ? getAiFieldErrors(session) : [];
  const isCardBodySession = session
    ? (session.mode === "generated" ? session.output.kind : session.output.kind) === "card-body"
    : template.output.kind === "card-body";
  const ready = session !== undefined && isSessionReady(session) && (!isCardBodySession || markdown.trim().length > 0);
  const duplicateCandidate =
    session && mode.kind === "create" ? selectDuplicateCandidate(template, values, "create", markdown) : undefined;
  const duplicate = duplicateCandidate
    ? findDuplicateCardByName(cardCacheRepository.get(template.deckId), duplicateCandidate)
    : undefined;

  useEffect(() => {
    const logProgress = (progress: GenerationProgress): void => {
      setCreationLog((current) => [...current, generationProgressMessage(progress)]);
    };

    async function generateInitialSession(controller: AbortController): Promise<void> {
      try {
        let generationTemplate = template;
        let livePreviewTemplate: MochiTemplate | undefined;
        if (template.output.kind === "mochi-template") {
          if (template.output.target.status === "needs-configuration") {
            throw new Error("Mochi template mappings need configuration");
          }
          const { mochiApiKey } = getPreferenceValues<Preferences>();
          const liveTemplate = await new MochiClient(mochiApiKey).getTemplate(
            template.output.target.template.id,
            controller.signal
          );
          const live = toMochiTemplateSnapshot(liveTemplate);
          const drift = detectTemplateDrift(template.output.target.template, live, template.output.target.bindings);
          if (drift.length > 0) {
            throw new Error(`${drift[0].message}. Edit the local template mappings.`);
          }
          generationTemplate = {
            ...template,
            output: {
              kind: "mochi-template",
              target: {
                ...template.output.target,
                template: refreshTemplateSnapshot(template.output.target.template, live),
              },
            },
          };
          livePreviewTemplate = liveTemplate;
        }
        const generated = await generateSession(generationTemplate, values, aiClient, controller.signal, logProgress);
        if (controller.signal.aborted) {
          return;
        }
        setPreviewMochiTemplate(livePreviewTemplate);
        setSession(generated);
        const errors = getAiFieldErrors(generated);
        if (errors.length > 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: `${errors.length} AI field${errors.length === 1 ? "" : "s"} failed`,
            message: "Successful fields were kept. Retry the failed fields from the preview.",
          });
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not generate card",
            message: errorMessage(error),
          });
          if (controller.signal.aborted) {
            return;
          }
          if (mode.kind === "create") {
            pop();
          } else {
            mode.onBack();
          }
        }
      } finally {
        if (activeController.current === controller) {
          activeController.current = undefined;
          setIsWorking(false);
        }
      }
    }

    let controller: AbortController | undefined;
    const startTimer = setTimeout(() => {
      controller = new AbortController();
      activeController.current = controller;
      void generateInitialSession(controller);
    }, 0);

    return () => {
      clearTimeout(startTimer);
      controller?.abort(new Error("Preview closed"));
      activeController.current?.abort(new Error("Preview closed"));
    };
  }, [template, values]);

  async function runRegeneration(
    title: string,
    operation: (generated: GeneratedSession, signal: AbortSignal) => Promise<GeneratedSession>
  ): Promise<void> {
    if (!session || session.mode !== "generated" || activeController.current) {
      return;
    }

    const generated = session;
    const controller = new AbortController();
    const currentOperation = operationNumber.current + 1;
    operationNumber.current = currentOperation;
    activeController.current = controller;
    setIsWorking(true);
    try {
      const updated = await operation(generated, controller.signal);
      if (operationNumber.current !== currentOperation) {
        return;
      }
      setSession(updated);
      const errors = getAiFieldErrors(updated);
      await showToast({
        style: errors.length === 0 ? Toast.Style.Success : Toast.Style.Failure,
        title: errors.length === 0 ? title : `${errors.length} AI field${errors.length === 1 ? "" : "s"} failed`,
        message: errors.length === 0 ? undefined : "Successful responses were kept. Retry the failed fields.",
      });
    } catch (error: unknown) {
      if (!controller.signal.aborted) {
        await showToast({ style: Toast.Style.Failure, title: "Regeneration failed", message: errorMessage(error) });
      }
    } finally {
      if (activeController.current === controller) {
        activeController.current = undefined;
        setIsWorking(false);
      }
    }
  }

  async function saveToMochi(): Promise<void> {
    if (!ready || activeController.current) {
      return;
    }

    const controller = new AbortController();
    activeController.current = controller;
    setIsWorking(true);
    try {
      const { mochiApiKey } = getPreferenceValues<Preferences>();
      const mochiOutput = getMochiOutput(session);
      const client = new MochiClient(mochiApiKey);
      if (mode.kind === "create") {
        if (!mochiOutput) {
          const candidateName = deriveMochiCardName(markdown);
          const duplicate = findDuplicateCardByName(cardCacheRepository.get(template.deckId), candidateName);
          if (duplicate) {
            const confirmed = await confirmAlert({
              icon: Icon.Warning,
              title: "Card Already Exists",
              message: `A card named "${duplicate.name}" already exists in this deck. Create another one?`,
              primaryAction: { title: "Create Duplicate", style: Alert.ActionStyle.Destructive },
            });
            if (controller.signal.aborted || !confirmed) {
              return;
            }
          }
        }
        const card = await client.createCard(
          {
            deckId: template.deckId,
            tags: template.tags,
            reviewReverse: template.reviewReverse,
            archived: template.archived,
            output: mochiOutput
              ? { kind: "mochi-template", templateId: mochiOutput.templateId, fields: mochiOutput.fields }
              : { kind: "card-body", content: markdown, templateMode: cardBodyTemplateMode(template) },
          },
          controller.signal
        );
        await showToast({
          style: Toast.Style.Success,
          title: "Card added to Mochi",
          message: card.id ? `Card ID: ${card.id}` : template.name,
        });
        await cacheCreatedCardBestEffort(client, template.deckId, card, controller.signal);
        if (card.id && mochiOutput) {
          await saveContextWithWarning(card.id, template, values, mochiOutput.templateId, controller.signal);
        } else if (mochiOutput) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Card Added, but Edit Context Was Not Saved",
            message: "Mochi did not return a card ID, so this card's generation inputs cannot be restored later.",
          });
        }
        mode.onCardAdded();
        pop();
      } else {
        if (!mochiOutput) {
          throw new Error("Edit Card requires a Mochi template output");
        }
        if (!previewMochiTemplate || previewMochiTemplate.id !== mochiOutput.templateId) {
          throw new Error("Live Mochi template is unavailable");
        }
        if (template.output.kind !== "mochi-template" || template.output.target.status !== "configured") {
          throw new Error("Edit Card requires configured Mochi template mappings");
        }
        let comparisonCard = mode.card;
        let current: MochiCard;
        let currentMochiTemplate: MochiTemplate;
        while (true) {
          [current, currentMochiTemplate] = await Promise.all([
            client.getCard(mode.card.id, controller.signal),
            client.getTemplate(mochiOutput.templateId, controller.signal),
          ]);
          const drift = detectTemplateDrift(
            toMochiTemplateSnapshot(previewMochiTemplate),
            toMochiTemplateSnapshot(currentMochiTemplate),
            template.output.target.bindings
          );
          if (drift.length > 0) {
            throw new Error(`${drift[0].message}. Edit the local template mappings.`);
          }
          if (current.deckId !== mode.card.deckId) {
            throw new Error("Card moved to another Mochi deck. Reopen it from the new deck before editing.");
          }
          if (comparisonCard.templateId !== current.templateId) {
            const changesTemplate = current.templateId !== mochiOutput.templateId;
            const confirmed = await confirmAlert({
              icon: Icon.Warning,
              title: "Card Template Changed in Mochi",
              message: changesTemplate
                ? `The card now uses a different template. Continuing will switch it to "${currentMochiTemplate.name}" and replace its fields.`
                : "The card now uses this edit session's template. Overwrite its latest fields?",
              primaryAction: {
                title: changesTemplate ? "Switch Template and Overwrite" : "Overwrite New Template",
                style: Alert.ActionStyle.Destructive,
              },
            });
            if (controller.signal.aborted || !confirmed) {
              return;
            }
            comparisonCard = current;
            continue;
          }
          if (!cardChangedSinceOpen(comparisonCard, current)) {
            break;
          }
          const confirmed = await confirmAlert({
            icon: Icon.Warning,
            title: "Card Changed in Mochi",
            message: "The card changed after editing started. Overwrite generated fields on top of the latest version?",
            primaryAction: { title: "Overwrite Latest", style: Alert.ActionStyle.Destructive },
          });
          if (controller.signal.aborted || !confirmed) {
            return;
          }
          comparisonCard = current;
        }
        const currentFieldIds = new Set(currentMochiTemplate.fields.map((field) => field.id));
        const fields = Object.fromEntries(
          Object.entries(mergeUpdateFields(current, mochiOutput.templateId, mochiOutput.fields)).filter(([id]) =>
            currentFieldIds.has(id)
          )
        );
        await client.updateCard(mode.card.id, { templateId: mochiOutput.templateId, fields }, controller.signal);
        let updatedCard: MochiCard = {
          ...current,
          content: "",
          templateId: mochiOutput.templateId,
          fields: Object.entries(fields).map(([id, value]) => ({ id, value })),
        };
        let refreshError: unknown;
        try {
          updatedCard = await client.getCard(mode.card.id, controller.signal);
        } catch (error: unknown) {
          refreshError = error;
        }
        if (controller.signal.aborted) {
          return;
        }
        await showToast(
          refreshError
            ? {
                style: Toast.Style.Failure,
                title: "Card Updated, but Refresh Failed",
                message: mochiErrorMessage(refreshError),
              }
            : { style: Toast.Style.Success, title: "Card updated in Mochi" }
        );
        if (controller.signal.aborted) {
          return;
        }
        await saveContextWithWarning(mode.card.id, template, values, mochiOutput.templateId, controller.signal);
        if (controller.signal.aborted) {
          return;
        }
        await mode.onCardUpdated(updatedCard, currentMochiTemplate, controller.signal);
      }
    } catch (error: unknown) {
      if (!controller.signal.aborted) {
        await showToast({
          style: Toast.Style.Failure,
          title: mode.kind === "create" ? "Could not add card to Mochi" : "Could not update card in Mochi",
          message: mochiErrorMessage(error),
        });
      }
    } finally {
      if (activeController.current === controller) {
        activeController.current = undefined;
        setIsWorking(false);
      }
    }
  }

  const generatedSession = session?.mode === "generated" ? session : undefined;
  const manuallyEditedSession = session?.mode === "manually-edited" ? session : undefined;
  const visibleTags = mode.kind === "create" ? template.tags : mode.card.tags;
  function leavePreview(): void {
    activeController.current?.abort(new Error("Preview closed"));
    if (mode.kind === "create") {
      pop();
    } else {
      mode.onBack();
    }
  }

  return (
    <Detail
      isLoading={isWorking}
      navigationTitle={
        session ? `${template.name} Preview` : `${mode.kind === "create" ? "Creating" : "Updating"} ${template.name}`
      }
      markdown={session ? previewMarkdown || "_No generated content yet._" : creationMarkdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Template" text={template.name} icon={Icon.Snippets} />
          <Detail.Metadata.Label title="Deck" text={template.deckName} icon={Icon.Book} />
          {duplicate ? (
            <Detail.Metadata.Label title="Duplicate" text={`A card for "${duplicate.name}" already exists`} icon="⚠️" />
          ) : null}
          {visibleTags.length > 0 ? (
            <Detail.Metadata.TagList title="Tags">
              {visibleTags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          {fieldErrors.length > 0 ? <Detail.Metadata.Separator /> : null}
          {fieldErrors.map((error) => (
            <Detail.Metadata.Label
              key={error.id}
              title={generationFieldTitle(session, error.id)}
              text={error.message}
              icon={Icon.Warning}
            />
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {session ? (
            <>
              {ready ? (
                <Action
                  title={mode.kind === "create" ? "Add to Mochi" : "Update Card in Mochi"}
                  icon={Icon.Upload}
                  onAction={saveToMochi}
                />
              ) : null}
              {generatedSession?.output.kind === "card-body" ? (
                <Action.Push
                  title="Edit Markdown"
                  icon={Icon.Pencil}
                  target={
                    <MarkdownEditor
                      initialMarkdown={markdown}
                      onSave={(editedMarkdown) => setSession(editMarkdown(generatedSession, editedMarkdown))}
                    />
                  }
                />
              ) : generatedSession?.output.kind === "mochi-template" ? (
                <Action.Push
                  title="Edit Field Values"
                  icon={Icon.Pencil}
                  target={<MochiValuesEditor session={generatedSession} onSave={setSession} />}
                />
              ) : (
                <Action
                  title="Restore Generated Version"
                  icon={Icon.Undo}
                  onAction={() => {
                    if (manuallyEditedSession) {
                      setSession(restoreGenerated(manuallyEditedSession));
                    }
                  }}
                />
              )}
              {generatedSession ? (
                <>
                  <Action
                    title="Regenerate All AI Fields"
                    icon={Icon.Repeat}
                    onAction={() =>
                      runRegeneration("All AI fields regenerated", (generated, signal) =>
                        regenerateAll(generated, aiClient, signal)
                      )
                    }
                  />
                  {getGeneratedAiFields(generatedSession).length > 0 ? (
                    <ActionPanel.Submenu title="Regenerate AI Field" icon={Icon.Wand}>
                      {getGeneratedAiFields(generatedSession).map((field) => (
                        <Action
                          key={field.id}
                          title={generationFieldTitle(generatedSession, field.id)}
                          icon={field.result.status === "error" ? Icon.Warning : Icon.Stars}
                          onAction={() =>
                            runRegeneration(
                              `${generationFieldTitle(generatedSession, field.id)} regenerated`,
                              (generated, signal) => regenerateField(generated, field.id, aiClient, signal)
                            )
                          }
                        />
                      ))}
                    </ActionPanel.Submenu>
                  ) : null}
                </>
              ) : null}
              <Action title="Back to Input" icon={Icon.ArrowLeft} onAction={leavePreview} />
              {isCardBodySession ? <Action.CopyToClipboard title="Copy Markdown" content={markdown} /> : null}
              {isCardBodySession ? (
                <Action.Push
                  title="Save as Markdown File"
                  icon={Icon.SaveDocument}
                  target={<SaveMarkdownForm markdown={markdown} suggestedName={template.name} />}
                />
              ) : null}
              {isWorking ? (
                <Action
                  title="Cancel Current Operation"
                  icon={Icon.Stop}
                  onAction={() => activeController.current?.abort(new Error("Operation cancelled"))}
                />
              ) : null}
            </>
          ) : (
            <Action
              title={mode.kind === "create" ? "Cancel Creation" : "Cancel Update"}
              icon={Icon.Stop}
              onAction={leavePreview}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function renderMochiTemplatePreview(
  session: GenerationSession,
  template: MochiTemplate,
  mode: CardPreviewProps["mode"]
): string {
  const output = getMochiOutput(session);
  if (!output || output.templateId !== template.id) {
    return renderRaycastMarkdown(renderMarkdown(session));
  }
  const values =
    mode.kind === "update" ? mergeUpdateFields(mode.card, output.templateId, output.fields) : output.fields;
  const card: MochiCard = {
    ...(mode.kind === "update"
      ? mode.card
      : {
          id: "preview",
          deckId: "",
          name: null,
          tags: [],
          reviews: [],
          aiCacheEntries: [],
        }),
    content: "",
    templateId: output.templateId,
    fields: Object.entries(values).map(([id, value]) => ({ id, value })),
    aiCacheEntries:
      mode.kind === "update" && mode.card.templateId === output.templateId ? mode.card.aiCacheEntries : [],
  };
  return cardMarkdown(card, template);
}

async function cacheCreatedCardBestEffort(
  client: MochiClient,
  deckId: string,
  card: { readonly id?: string; readonly name?: string | null },
  signal: AbortSignal
): Promise<void> {
  if (card.id === undefined) {
    return;
  }
  if (card.name !== undefined) {
    upsertCreatedCardBestEffort(cardCacheRepository, deckId, card);
    return;
  }
  try {
    const createdCard = await client.getCard(card.id, signal);
    if (!signal.aborted) {
      upsertCreatedCardBestEffort(cardCacheRepository, deckId, { id: createdCard.id, name: createdCard.name });
    }
  } catch {
    // The card already exists. A cache write must not fail the operation.
  }
}

async function saveContextWithWarning(
  cardId: string,
  template: CardTemplate,
  values: FieldValues,
  mochiTemplateId: string,
  signal: AbortSignal
): Promise<void> {
  try {
    await contextRepository.save({
      cardId,
      generationTemplateId: template.id,
      generationTemplateUpdatedAt: template.updatedAt,
      mochiTemplateId,
      inputValues: values,
    });
  } catch (error: unknown) {
    if (!signal.aborted) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Card saved, but edit context was not",
        message: errorMessage(error),
      });
    }
  }
}

function generationProgressMessage(progress: GenerationProgress): string {
  switch (progress.kind) {
    case "substituting-fields":
      return "Substituting field values into template...";
    case "generating-ai-fields":
      return `Generating ${progress.total} AI field${progress.total === 1 ? "" : "s"}...`;
    case "ai-field-finished":
      return progress.succeeded
        ? `AI field ${progress.number}/${progress.total} generated...`
        : `AI field ${progress.number}/${progress.total} failed...`;
    case "rendering-preview":
      return "Rendering card preview...";
    default:
      return assertNever(progress);
  }
}

function mochiErrorMessage(error: unknown): string {
  if (error instanceof MochiError && error.kind === "unauthorized") {
    return "Check the Mochi API key in extension preferences.";
  }
  return errorMessage(error);
}

function cardBodyTemplateMode(template: CardTemplate): "none" | "deck-default" {
  if (template.output.kind !== "card-body") {
    throw new Error("Card Body output requires a card-body template mode");
  }
  return template.output.templateMode;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

function assertNever(value: never): never {
  throw new Error(`Unexpected progress event: ${JSON.stringify(value)}`);
}
