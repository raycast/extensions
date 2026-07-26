import { randomUUID } from "node:crypto";

import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";

import {
  classifyMochiField,
  createAutomaticBindings,
  detectTemplateDrift,
  isDirectBindingCompatible,
} from "../domain/mochi-template";
import {
  ensurePrimaryInputField,
  ensurePrimaryMochiBinding,
  isPrimaryInputType,
  MOCHI_PRIMARY_FIELD_ID,
  primarySourceFieldId,
} from "../domain/primary-field";
import type {
  CardOutput,
  CardTemplate,
  CardTemplateDraft,
  MochiFieldBinding,
  MochiTemplateSnapshot,
  TemplateInputField,
} from "../domain/template";
import { validateTemplate, type TemplateValidationError } from "../domain/template-validation";
import { MochiClient, toMochiTemplateSnapshot } from "../services/mochi-client";
import type { TemplateRepository } from "../storage/template-repository";

type TemplateFormProps = {
  readonly repository: TemplateRepository;
  readonly template?: CardTemplate;
  readonly initialDraft?: CardTemplateDraft;
  readonly onSaved: (savedTemplate: CardTemplate) => Promise<void> | void;
  readonly onDeleted?: () => Promise<void> | void;
  readonly submitTitle?: string;
  readonly closeAfterSave?: boolean;
  readonly warnings?: readonly string[];
  readonly allowDelete?: boolean;
  readonly validateDraft?: (draft: CardTemplateDraft) => string | undefined;
};

type Preferences = { readonly mochiApiKey: string };

const NO_TEMPLATE_VALUE = "__no-template__";
const DEFAULT_DECK_TEMPLATE_VALUE = "__default-deck-template__";
const UNMAPPED_VALUE = "__unmapped__";
const CUSTOM_VALUE = "__custom__";

export function TemplateForm({
  repository,
  template,
  initialDraft,
  onSaved,
  onDeleted,
  submitTitle,
  closeAfterSave = true,
  warnings = [],
  allowDelete = true,
  validateDraft,
}: TemplateFormProps) {
  const { pop } = useNavigation();
  const { mochiApiKey } = getPreferenceValues<Preferences>();
  const initial = template ?? initialDraft;
  const initialTarget = initial?.output.kind === "mochi-template" ? initial.output.target : undefined;
  const initialSnapshot = initialTarget?.status === "configured" ? initialTarget.template : undefined;
  const initialMochiTemplateId =
    initialTarget?.status === "configured" ? initialTarget.template.id : initialTarget?.templateId;
  const initialFields = ensurePrimaryInputField(
    initial?.fields ?? [createInitialField()],
    primarySourceFieldId(initial?.output)
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [deckId, setDeckId] = useState(initial?.deckId ?? "");
  const [mochiTemplateId, setMochiTemplateId] = useState(
    initialTarget
      ? initialTarget.status === "configured"
        ? initialTarget.template.id
        : initialTarget.templateId
      : initial?.output.kind === "card-body" && initial.output.templateMode === "deck-default"
        ? DEFAULT_DECK_TEMPLATE_VALUE
        : NO_TEMPLATE_VALUE
  );
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [cardBody, setCardBody] = useState(initial?.cardBody ?? "");
  const [reviewReverse, setReviewReverse] = useState(initial?.reviewReverse ?? false);
  const [archived, setArchived] = useState(initial?.archived ?? false);
  const [fields, setFields] = useState<readonly TemplateInputField[]>(initialFields);
  const [bindings, setBindings] = useState<readonly MochiFieldBinding[]>(
    initialTarget?.status === "configured"
      ? ensurePrimaryMochiBinding(initialFields, initialTarget.template, initialTarget.bindings)
      : []
  );
  const [selectedSnapshotOverride, setSelectedSnapshotOverride] = useState<MochiTemplateSnapshot | undefined>();
  const [showValidation, setShowValidation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const saving = useRef(false);
  const activeSaveController = useRef<AbortController | undefined>(undefined);
  const activeTemplateLoadController = useRef<AbortController | undefined>(undefined);
  const isMounted = useRef(true);
  const saveOperationNumber = useRef(0);
  const templateLoadOperationNumber = useRef(0);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      saveOperationNumber.current += 1;
      templateLoadOperationNumber.current += 1;
      activeSaveController.current?.abort(new Error("Template form closed"));
      activeTemplateLoadController.current?.abort(new Error("Template form closed"));
    };
  }, []);

  const { data: catalog, isLoading: isLoadingCatalog } = usePromise(async () => {
    const client = new MochiClient(mochiApiKey);
    const decks = await loadCatalogPart(() => client.listDecks());
    const mochiTemplates = await loadCatalogPart(() => client.listTemplates());
    const selectedTemplate = initialMochiTemplateId
      ? await loadCatalogPart(() => client.getTemplate(initialMochiTemplateId))
      : undefined;
    return { decks, mochiTemplates, selectedTemplate };
  }, []);
  const decks = catalog?.decks.data ?? [];
  const mochiTemplates = catalog?.mochiTemplates.data ?? [];
  const selectedDeck = decks.find((deck) => deck.id === deckId);
  const selectedLiveTemplate = mochiTemplates.find((candidate) => candidate.id === mochiTemplateId);
  const selectedLiveSnapshot = selectedLiveTemplate ? toMochiTemplateSnapshot(selectedLiveTemplate) : undefined;
  const loadedSelectedSnapshot = catalog?.selectedTemplate?.data
    ? toMochiTemplateSnapshot(catalog.selectedTemplate.data)
    : undefined;
  const selectedSnapshot =
    selectedSnapshotOverride?.id === mochiTemplateId
      ? selectedSnapshotOverride
      : loadedSelectedSnapshot?.id === mochiTemplateId
        ? loadedSelectedSnapshot
        : selectedLiveSnapshot?.id === mochiTemplateId
          ? selectedLiveSnapshot
          : catalog === undefined && initialSnapshot?.id === mochiTemplateId
            ? initialSnapshot
            : undefined;
  const activeBindings = selectedSnapshot
    ? ensurePrimaryMochiBinding(fields, selectedSnapshot, removeUnsupportedBindings(bindings, selectedSnapshot))
    : bindings;
  const output = createOutput(mochiTemplateId, selectedSnapshot, activeBindings);
  const draft = createDraft({
    name,
    deckId,
    deckName: selectedDeck?.name ?? initial?.deckName ?? "",
    tags,
    cardBody,
    output,
    reviewReverse,
    archived,
    fields,
  });
  const validationErrors = showValidation ? validateTemplate(draft) : [];
  const staleBindings = selectedSnapshot
    ? bindings.filter((binding) => !selectedSnapshot.fields.some((field) => field.id === binding.targetFieldId))
    : bindings;

  async function save(): Promise<void> {
    if (saving.current) {
      return;
    }
    if (isLoadingCatalog) {
      await showToast({ style: Toast.Style.Animated, title: "Loading current Mochi template" });
      return;
    }
    if (isLoadingTemplate || activeTemplateLoadController.current) {
      await showToast({ style: Toast.Style.Animated, title: "Loading selected Mochi template" });
      return;
    }
    setShowValidation(true);
    const errors = validateTemplate(draft);
    if (errors.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Fix the template before saving",
        message: errors[0].message,
      });
      return;
    }
    const controller = new AbortController();
    const currentOperation = saveOperationNumber.current + 1;
    saveOperationNumber.current = currentOperation;
    activeSaveController.current = controller;
    const isCurrent = (): boolean =>
      isMounted.current && saveOperationNumber.current === currentOperation && !controller.signal.aborted;
    saving.current = true;
    setIsSaving(true);
    try {
      let draftToSave = draft;
      if (draft.output.kind === "mochi-template" && draft.output.target.status === "configured") {
        const liveSnapshot = toMochiTemplateSnapshot(
          await new MochiClient(mochiApiKey).getTemplate(draft.output.target.template.id, controller.signal)
        );
        if (!isCurrent()) {
          return;
        }
        const drift = detectTemplateDrift(draft.output.target.template, liveSnapshot, draft.output.target.bindings);
        setSelectedSnapshotOverride(liveSnapshot);
        if (drift.length > 0) {
          setShowValidation(true);
          await showToast({
            style: Toast.Style.Failure,
            title: "Mochi Template Changed",
            message: `${drift[0].message}. Review the field mappings before saving.`,
          });
          return;
        }
        draftToSave = {
          ...draft,
          output: {
            kind: "mochi-template",
            target: { ...draft.output.target, template: liveSnapshot },
          },
        };
      }
      const refreshedErrors = validateTemplate(draftToSave);
      if (refreshedErrors.length > 0) {
        setShowValidation(true);
        await showToast({
          style: Toast.Style.Failure,
          title: "Fix the template before saving",
          message: refreshedErrors[0].message,
        });
        return;
      }
      const draftError = validateDraft?.(draftToSave);
      if (draftError) {
        await showToast({ style: Toast.Style.Failure, title: "Template Isn't Compatible", message: draftError });
        return;
      }
      if (!isCurrent()) {
        return;
      }
      const saved = template ? await repository.update(template.id, draftToSave) : await repository.create(draftToSave);
      if (!isCurrent()) {
        return;
      }
      await onSaved(saved);
      if (!isCurrent()) {
        return;
      }
      await showToast({ style: Toast.Style.Success, title: template ? "Template updated" : "Template created" });
      if (isCurrent() && closeAfterSave) {
        pop();
      }
    } catch (error: unknown) {
      if (isCurrent()) {
        await showToast({ style: Toast.Style.Failure, title: "Could not save template", message: errorMessage(error) });
      }
    } finally {
      if (activeSaveController.current === controller) {
        activeSaveController.current = undefined;
      }
      if (isMounted.current && saveOperationNumber.current === currentOperation) {
        saving.current = false;
        setIsSaving(false);
      }
    }
  }

  async function changeMochiTemplate(nextId: string): Promise<void> {
    activeTemplateLoadController.current?.abort(new Error("Mochi template selection changed"));
    const currentOperation = templateLoadOperationNumber.current + 1;
    templateLoadOperationNumber.current = currentOperation;
    activeTemplateLoadController.current = undefined;
    if (nextId === mochiTemplateId && selectedSnapshot) {
      setIsLoadingTemplate(false);
      return;
    }
    const controller = new AbortController();
    activeTemplateLoadController.current = controller;
    const isCurrent = (): boolean =>
      isMounted.current && templateLoadOperationNumber.current === currentOperation && !controller.signal.aborted;
    setIsLoadingTemplate(true);
    try {
      if (bindings.length > 0 && !isCardBodyTemplateValue(mochiTemplateId)) {
        const confirmed = await confirmAlert({
          icon: Icon.Warning,
          title: "Replace Mochi field mappings?",
          message: "Existing field mappings will be removed.",
          primaryAction: { title: "Replace", style: Alert.ActionStyle.Destructive },
        });
        if (!isCurrent() || !confirmed) {
          return;
        }
      }
      if (isCardBodyTemplateValue(nextId)) {
        setMochiTemplateId(nextId);
        setSelectedSnapshotOverride(undefined);
        setBindings([]);
        return;
      }
      const snapshot = toMochiTemplateSnapshot(
        await new MochiClient(mochiApiKey).getTemplate(nextId, controller.signal)
      );
      if (!isCurrent()) {
        return;
      }
      setMochiTemplateId(nextId);
      setSelectedSnapshotOverride(snapshot);
      setBindings(createAutomaticBindings(fields, snapshot));
    } catch (error: unknown) {
      if (isCurrent()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load Mochi template",
          message: errorMessage(error),
        });
      }
    } finally {
      if (activeTemplateLoadController.current === controller) {
        activeTemplateLoadController.current = undefined;
      }
      if (isMounted.current && templateLoadOperationNumber.current === currentOperation) {
        setIsLoadingTemplate(false);
      }
    }
  }

  async function deleteTemplate(): Promise<void> {
    if (!template) {
      return;
    }
    const confirmed = await confirmAlert({
      icon: Icon.Trash,
      title: `Delete "${template.name}"?`,
      message: "This template cannot be recovered.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }
    try {
      await repository.delete(template.id);
      await onDeleted?.();
      await showToast({ style: Toast.Style.Success, title: "Template deleted" });
      pop();
    } catch (error: unknown) {
      await showToast({ style: Toast.Style.Failure, title: "Could not delete template", message: errorMessage(error) });
    }
  }

  function updateField(id: string, update: Partial<TemplateInputField>): void {
    setFields((current) =>
      ensurePrimaryInputField(current.map((field) => (field.id === id ? updateInputField(field, update) : field)))
    );
  }

  function updateFieldType(id: string, type: TemplateInputField["type"]): void {
    setFields((current) => {
      if (current[0]?.id === id && !isPrimaryInputType(type)) {
        return current;
      }
      return ensurePrimaryInputField(
        current.map((field) => (field.id === id ? changeInputFieldType(field, type) : field))
      );
    });
  }

  function moveField(id: string, direction: -1 | 1): void {
    setFields((current) => {
      const index = current.findIndex((field) => field.id === id);
      const destination = index + direction;
      if (index <= 0 || destination <= 0 || destination >= current.length) {
        return current;
      }
      const reordered = [...current];
      const [field] = reordered.splice(index, 1);
      reordered.splice(destination, 0, field);
      return reordered;
    });
  }

  function updateBinding(targetFieldId: string, value: string): void {
    if (targetFieldId === MOCHI_PRIMARY_FIELD_ID) {
      return;
    }
    setBindings((current) => {
      const remaining = current.filter((binding) => binding.targetFieldId !== targetFieldId);
      if (value === UNMAPPED_VALUE) {
        return remaining;
      }
      if (value === CUSTOM_VALUE) {
        return [...remaining, { kind: "custom", targetFieldId, template: "" }];
      }
      return [...remaining, { kind: "input", targetFieldId, sourceFieldId: value.slice("input:".length) }];
    });
  }

  function updateCustomMapping(targetFieldId: string, mappingTemplate: string): void {
    setBindings((current) =>
      current.map((binding) =>
        binding.targetFieldId === targetFieldId && binding.kind === "custom"
          ? { ...binding, template: mappingTemplate }
          : binding
      )
    );
  }

  return (
    <Form
      isLoading={isSaving || isLoadingTemplate || isLoadingCatalog}
      navigationTitle={template ? `Edit ${template.name}` : "Create Template"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={submitTitle ?? (template ? "Save Changes" : "Create Template")}
            icon={Icon.SaveDocument}
            onSubmit={save}
          />
          <Action
            title="New Field"
            icon={Icon.PlusCircle}
            shortcut={Keyboard.Shortcut.Common.New}
            onAction={() => setFields((current) => [...current, createEmptyField()])}
          />
          {fields.length > 1 ? (
            <ActionPanel.Submenu
              title="Remove Field"
              icon={Icon.MinusCircle}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            >
              {fields.slice(1).map((field, index) => (
                <Action
                  key={field.id}
                  title={field.name || `Field ${index + 2}`}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => setFields((current) => current.filter((candidate) => candidate.id !== field.id))}
                />
              ))}
            </ActionPanel.Submenu>
          ) : null}
          {fields.length > 1 ? (
            <ActionPanel.Submenu title="Reorder Fields" icon={Icon.Filter} shortcut={{ modifiers: ["cmd"], key: "m" }}>
              {fields.flatMap((field, index) => [
                ...(index > 1
                  ? [
                      <Action
                        key={`${field.id}-up`}
                        title={`Move ${field.name || `Field ${index + 1}`} up`}
                        icon={Icon.ArrowUp}
                        onAction={() => moveField(field.id, -1)}
                      />,
                    ]
                  : []),
                ...(index > 0 && index < fields.length - 1
                  ? [
                      <Action
                        key={`${field.id}-down`}
                        title={`Move ${field.name || `Field ${index + 1}`} Down`}
                        icon={Icon.ArrowDown}
                        onAction={() => moveField(field.id, 1)}
                      />,
                    ]
                  : []),
              ])}
            </ActionPanel.Submenu>
          ) : null}
          {staleBindings.length > 0 ? (
            <ActionPanel.Submenu title="Remove Stale Mapping" icon={Icon.Warning}>
              {staleBindings.map((binding) => (
                <Action
                  key={binding.targetFieldId}
                  title={binding.targetFieldId}
                  icon={Icon.Trash}
                  onAction={() => updateBinding(binding.targetFieldId, UNMAPPED_VALUE)}
                />
              ))}
            </ActionPanel.Submenu>
          ) : null}
          {template && allowDelete ? (
            <ActionPanel.Section title="Danger Zone">
              <Action
                title="Delete Template"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={deleteTemplate}
              />
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Template Name"
        placeholder="Greek vocabulary"
        value={name}
        error={fieldError(validationErrors, "name")}
        onChange={setName}
      />
      {warnings.map((warning, index) => (
        <Form.Description key={`${warning}-${index}`} title="Warning" text={warning} />
      ))}
      <Form.Dropdown
        id="deckId"
        title="Mochi Deck"
        placeholder="Choose a deck"
        value={deckId}
        error={fieldError(validationErrors, "deckId")}
        onChange={setDeckId}
      >
        {deckId && !selectedDeck ? (
          <Form.Dropdown.Item title={initial?.deckName || "Unavailable deck"} value={deckId} icon={Icon.Book} />
        ) : null}
        {decks.map((deck) => (
          <Form.Dropdown.Item key={deck.id} title={deck.name} value={deck.id} icon={Icon.Book} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="mochiTemplateId"
        title="Mochi Template"
        value={mochiTemplateId}
        error={fieldError(validationErrors, "output")}
        onChange={(value) => void changeMochiTemplate(value)}
      >
        <Form.Dropdown.Item title="No Template" value={NO_TEMPLATE_VALUE} icon={Icon.CircleDisabled} />
        <Form.Dropdown.Item title="Default Deck Template" value={DEFAULT_DECK_TEMPLATE_VALUE} icon={Icon.Link} />
        {!isCardBodyTemplateValue(mochiTemplateId) && !selectedLiveTemplate ? (
          <Form.Dropdown.Item
            title={selectedSnapshot?.name ?? initialSnapshot?.name ?? "Unavailable template"}
            value={mochiTemplateId}
            icon={Icon.Warning}
          />
        ) : null}
        {mochiTemplates.map((candidate) => (
          <Form.Dropdown.Item key={candidate.id} title={candidate.name} value={candidate.id} icon={Icon.Box} />
        ))}
      </Form.Dropdown>
      {mochiTemplateId === NO_TEMPLATE_VALUE ? (
        <Form.Description title="Template Behavior" text="Creates a card without a Mochi template." />
      ) : mochiTemplateId === DEFAULT_DECK_TEMPLATE_VALUE ? (
        <Form.Description title="Template Behavior" text="Uses the default template configured for this deck." />
      ) : null}
      {catalog?.decks.error ? <Form.Description title="Mochi Deck" text={errorMessage(catalog.decks.error)} /> : null}
      {catalog?.mochiTemplates.error ? (
        <Form.Description title="Mochi Template" text={errorMessage(catalog.mochiTemplates.error)} />
      ) : null}
      {catalog?.selectedTemplate?.error ? (
        <Form.Description title="Selected Mochi Template" text={errorMessage(catalog.selectedTemplate.error)} />
      ) : null}

      <Form.Separator />
      <Form.Description
        title="Primary Field"
        text="Required. Sets the card name in Mochi and cannot be removed or reordered."
      />
      {fields.map((field, index) => (
        <InputFieldControls
          key={field.id}
          index={index}
          field={field}
          errors={validationErrors}
          onChange={(update) => updateField(field.id, update)}
          onTypeChange={(type) => updateFieldType(field.id, type)}
        />
      ))}

      <Form.Separator />
      {isCardBodyTemplateValue(mochiTemplateId) ? (
        <Form.TextArea
          id="cardBody"
          title="Card Body"
          placeholder={"# <<word>>\n\n<ai>\nTranslate <<word>>.\n</ai>"}
          info="Use <<field>> placeholders and <ai>...</ai> fields"
          value={cardBody}
          error={fieldError(validationErrors, "cardBody")}
          onChange={setCardBody}
        />
      ) : selectedSnapshot ? (
        <>
          <Form.Description title="Mochi Field Mappings" text="Unmapped fields are omitted from the request." />
          {selectedSnapshot.fields.map((target) => (
            <MappingControls
              key={target.id}
              target={target}
              fields={fields}
              binding={activeBindings.find((binding) => binding.targetFieldId === target.id)}
              errors={validationErrors}
              bindingIndex={activeBindings.findIndex((binding) => binding.targetFieldId === target.id)}
              onChange={(value) => updateBinding(target.id, value)}
              onCustomChange={(value) => updateCustomMapping(target.id, value)}
            />
          ))}
          {staleBindings.length > 0 ? (
            <Form.Description
              title="Stale Mappings"
              text={`${staleBindings.length} mapping(s) refer to removed Mochi fields. Remove them from Actions.`}
            />
          ) : null}
        </>
      ) : (
        <Form.Description
          title="Mochi Field Mappings"
          text="Template unavailable. Select another target or No Template."
        />
      )}

      <Form.Separator />
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="greek, vocabulary"
        info="Comma-separated Mochi manual tags"
        value={tags}
        onChange={setTags}
      />
      <Form.Checkbox
        id="reviewReverse"
        title="Review"
        label="Enable reverse review"
        value={reviewReverse}
        onChange={setReviewReverse}
      />
      <Form.Checkbox
        id="archived"
        title="Status"
        label="Create cards as archived"
        value={archived}
        onChange={setArchived}
      />
      {validationErrors.length > 0 ? (
        <Form.Description
          title="Validation"
          text={`${validationErrors.length} issue(s) must be fixed before saving.`}
        />
      ) : null}
    </Form>
  );
}

function InputFieldControls({
  index,
  field,
  errors,
  onChange,
  onTypeChange,
}: {
  readonly index: number;
  readonly field: TemplateInputField;
  readonly errors: readonly TemplateValidationError[];
  readonly onChange: (update: Partial<TemplateInputField>) => void;
  readonly onTypeChange: (type: TemplateInputField["type"]) => void;
}) {
  return (
    <>
      {index > 0 ? <Form.Separator /> : null}
      <Form.TextField
        id={`field-${field.id}-name`}
        title={index === 0 ? "Field 1 (primary)" : `Field ${index + 1}`}
        info={index === 0 ? "This is the card's primary field and cannot be removed." : undefined}
        placeholder="word"
        value={field.name}
        error={fieldError(errors, `fields.${index}.name`)}
        onChange={(name) => onChange({ name })}
      />
      <Form.Dropdown
        id={`field-${field.id}-type`}
        title="Type"
        value={field.type}
        onChange={(value) => {
          if (isInputFieldType(value)) {
            onTypeChange(value);
          }
        }}
      >
        <Form.Dropdown.Item title="Text" value="text" icon={Icon.Text} />
        <Form.Dropdown.Item title="Number" value="number" icon={Icon.Hashtag} />
        {index > 0 ? <Form.Dropdown.Item title="Boolean" value="boolean" icon={Icon.CheckCircle} /> : null}
      </Form.Dropdown>
      {field.type !== "boolean" && index > 0 ? (
        <Form.Checkbox
          id={`field-${field.id}-required`}
          label="Required"
          value={field.required}
          onChange={(required) => onChange({ required })}
        />
      ) : null}
      {field.type === "text" ? (
        <Form.Checkbox
          id={`field-${field.id}-multiline`}
          label="Multiline"
          value={field.multiline}
          onChange={(multiline) => onChange({ multiline })}
        />
      ) : null}
    </>
  );
}

function MappingControls({
  target,
  fields,
  binding,
  errors,
  bindingIndex,
  onChange,
  onCustomChange,
}: {
  readonly target: MochiTemplateSnapshot["fields"][number];
  readonly fields: readonly TemplateInputField[];
  readonly binding?: MochiFieldBinding;
  readonly errors: readonly TemplateValidationError[];
  readonly bindingIndex: number;
  readonly onChange: (value: string) => void;
  readonly onCustomChange: (value: string) => void;
}) {
  const classification = classifyMochiField(target);
  const title = `${target.name} ←`;
  if (target.id === MOCHI_PRIMARY_FIELD_ID) {
    return (
      <Form.Description title={`${target.name} (primary) ←`} text={`${fields[0]?.name || "Primary field"} (primary)`} />
    );
  }
  if (classification === "unsupported") {
    return <Form.Description title={title} text="Mapping is not supported for this field." />;
  }
  const value =
    binding?.kind === "input"
      ? `input:${binding.sourceFieldId}`
      : binding?.kind === "custom"
        ? CUSTOM_VALUE
        : UNMAPPED_VALUE;
  const compatibleFields = fields.filter((field) => isDirectBindingCompatible(field, target));
  const boundSource =
    binding?.kind === "input" ? fields.find((field) => field.id === binding.sourceFieldId) : undefined;
  const hasIncompatibleBinding = boundSource !== undefined && !isDirectBindingCompatible(boundSource, target);
  return (
    <>
      <Form.Dropdown
        id={`mapping-${target.id}`}
        title={title}
        value={value}
        error={bindingIndex < 0 ? undefined : fieldErrorPrefix(errors, `output.bindings.${bindingIndex}`)}
        onChange={onChange}
      >
        <Form.Dropdown.Item title="Not Mapped" value={UNMAPPED_VALUE} icon={Icon.CircleDisabled} />
        {binding?.kind === "input" && !fields.some((field) => field.id === binding.sourceFieldId) ? (
          <Form.Dropdown.Item
            title="Missing input field"
            value={`input:${binding.sourceFieldId}`}
            icon={Icon.Warning}
          />
        ) : null}
        {binding?.kind === "input" && hasIncompatibleBinding ? (
          <Form.Dropdown.Item
            title={`${boundSource.name} (incompatible type)`}
            value={`input:${binding.sourceFieldId}`}
            icon={Icon.Warning}
          />
        ) : null}
        {compatibleFields.map((field) => (
          <Form.Dropdown.Item key={field.id} title={field.name} value={`input:${field.id}`} icon={Icon.TextInput} />
        ))}
        <Form.Dropdown.Item title="Custom Mapping…" value={CUSTOM_VALUE} icon={Icon.Pencil} />
      </Form.Dropdown>
      {binding?.kind === "custom" ? (
        <Form.TextArea
          id={`mapping-${target.id}-custom`}
          title="Custom Mapping"
          placeholder={`<<${fields[0]?.name ?? "field"}>>`}
          info="Use <<field>> placeholders and <ai>...</ai> fields"
          value={binding.template}
          error={bindingIndex < 0 ? undefined : fieldError(errors, `output.bindings.${bindingIndex}.template`)}
          onChange={onCustomChange}
        />
      ) : null}
    </>
  );
}

function createOutput(
  templateId: string,
  snapshot: MochiTemplateSnapshot | undefined,
  bindings: readonly MochiFieldBinding[]
): CardOutput {
  if (templateId === NO_TEMPLATE_VALUE) {
    return { kind: "card-body", templateMode: "none" };
  }
  if (templateId === DEFAULT_DECK_TEMPLATE_VALUE) {
    return { kind: "card-body", templateMode: "deck-default" };
  }
  return snapshot
    ? { kind: "mochi-template", target: { status: "configured", template: snapshot, bindings } }
    : { kind: "mochi-template", target: { status: "needs-configuration", templateId } };
}

function isCardBodyTemplateValue(value: string): boolean {
  return value === NO_TEMPLATE_VALUE || value === DEFAULT_DECK_TEMPLATE_VALUE;
}

function removeUnsupportedBindings(
  bindings: readonly MochiFieldBinding[],
  snapshot: MochiTemplateSnapshot
): readonly MochiFieldBinding[] {
  const targetsById = new Map(snapshot.fields.map((field) => [field.id, field]));
  return bindings.filter((binding) => {
    const target = targetsById.get(binding.targetFieldId);
    return target === undefined || classifyMochiField(target) === "mappable";
  });
}

function createDraft(values: {
  readonly name: string;
  readonly deckId: string;
  readonly deckName: string;
  readonly tags: string;
  readonly cardBody: string;
  readonly output: CardOutput;
  readonly reviewReverse: boolean;
  readonly archived: boolean;
  readonly fields: readonly TemplateInputField[];
}): CardTemplateDraft {
  return {
    name: values.name,
    deckId: values.deckId,
    deckName: values.deckName,
    tags: values.tags.split(","),
    cardBody: values.cardBody,
    output: values.output,
    reviewReverse: values.reviewReverse,
    archived: values.archived,
    fields: values.fields,
  };
}

function createEmptyField(): TemplateInputField {
  return { id: randomUUID(), name: "", type: "text", required: false, multiline: false };
}

function createInitialField(): TemplateInputField {
  return { id: randomUUID(), name: "Name", type: "text", required: true, multiline: false };
}

function changeInputFieldType(field: TemplateInputField, type: TemplateInputField["type"]): TemplateInputField {
  if (type === "text") {
    return {
      id: field.id,
      name: field.name,
      type,
      required: field.type === "boolean" ? false : field.required,
      multiline: false,
    };
  }
  if (type === "number") {
    return { id: field.id, name: field.name, type, required: field.type === "boolean" ? false : field.required };
  }
  return { id: field.id, name: field.name, type };
}

function updateInputField(field: TemplateInputField, update: Partial<TemplateInputField>): TemplateInputField {
  const name = update.name ?? field.name;
  if (field.type === "text") {
    return {
      ...field,
      name,
      required: "required" in update && typeof update.required === "boolean" ? update.required : field.required,
      multiline: "multiline" in update && typeof update.multiline === "boolean" ? update.multiline : field.multiline,
    };
  }
  if (field.type === "number") {
    return {
      ...field,
      name,
      required: "required" in update && typeof update.required === "boolean" ? update.required : field.required,
    };
  }
  return { ...field, name };
}

function isInputFieldType(value: string): value is TemplateInputField["type"] {
  return value === "text" || value === "number" || value === "boolean";
}

function fieldError(errors: readonly TemplateValidationError[], path: string): string | undefined {
  const messages = errors.filter((error) => error.path === path).map((error) => error.message);
  return messages.length ? messages.join(" · ") : undefined;
}

function fieldErrorPrefix(errors: readonly TemplateValidationError[], path: string): string | undefined {
  const messages = errors
    .filter((error) => error.path === path || error.path.startsWith(`${path}.`))
    .map((error) => error.message);
  return messages.length ? messages.join(" · ") : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

type CatalogPart<T> =
  { readonly data: T; readonly error?: undefined } | { readonly data?: undefined; readonly error: unknown };

async function loadCatalogPart<T>(load: () => Promise<T>): Promise<CatalogPart<T>> {
  try {
    return { data: await load() };
  } catch (error: unknown) {
    return { error };
  }
}
