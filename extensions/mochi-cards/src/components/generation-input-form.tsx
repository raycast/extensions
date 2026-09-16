import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { Fragment, useState, type ReactNode } from "react";

import { findDuplicateCardByName, selectDuplicateCandidate } from "../domain/card-duplicates";
import type { CardTemplate, FieldValues } from "../domain/template";
import { CardCacheRepository } from "../storage/card-cache-repository";
import { CardPreview } from "./card-preview";

const cardCacheRepository = new CardCacheRepository();

type GenerationInputFormProps = {
  readonly template: CardTemplate;
  readonly initialValues?: FieldValues;
  readonly mode?: "create" | "update";
  readonly onGenerate?: (values: FieldValues) => Promise<void> | void;
  readonly onValuesChange?: (values: FieldValues) => void;
  readonly secondaryActions?: ReactNode;
  readonly warnings?: readonly string[];
};

export function GenerationInputForm({
  template,
  initialValues,
  mode = "create",
  onGenerate,
  onValuesChange,
  secondaryActions,
  warnings = [],
}: GenerationInputFormProps) {
  const { push } = useNavigation();
  const emptyValues = (): FieldValues =>
    Object.fromEntries(
      template.fields.map((field) => [field.id, initialValues?.[field.id] ?? (field.type === "boolean" ? false : "")])
    );
  const [values, setValues] = useState<FieldValues>(emptyValues);
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const isMochiTemplate = template.output.kind === "mochi-template";
  const duplicateCandidate = selectDuplicateCandidate(template, values, mode);
  const duplicate = duplicateCandidate
    ? findDuplicateCardByName(cardCacheRepository.get(template.deckId), duplicateCandidate)
    : undefined;
  function resetInput(): void {
    setValues(emptyValues());
    setErrors({});
  }

  async function generate(): Promise<void> {
    const nextErrors = Object.fromEntries(
      template.fields.flatMap((field) => {
        const value = values[field.id];
        if (field.type === "boolean") {
          return [];
        }
        const text = typeof value === "string" ? value : "";
        if (field.required && text.trim().length === 0) {
          return [[field.id, `${field.name} is required`]];
        }
        if (field.type === "number" && text.trim() && !Number.isFinite(Number(text))) {
          return [[field.id, `${field.name} must be a finite number`]];
        }
        return [];
      })
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      await showToast({ style: Toast.Style.Failure, title: "Fill in the required fields" });
      return;
    }

    const currentDuplicateCandidate = selectDuplicateCandidate(template, values, mode);
    const currentDuplicate = currentDuplicateCandidate
      ? findDuplicateCardByName(cardCacheRepository.get(template.deckId), currentDuplicateCandidate)
      : undefined;
    if (currentDuplicate) {
      const confirmed = await confirmAlert({
        icon: Icon.Warning,
        title: "Card Already Exists",
        message: `A card named "${currentDuplicate.name}" already exists in this deck. Create another one?`,
        primaryAction: { title: "Create Duplicate", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) {
        return;
      }
    }

    if (onGenerate) {
      await onGenerate(values);
    } else {
      push(<CardPreview template={template} values={values} mode={{ kind: "create", onCardAdded: resetInput }} />);
    }
  }

  return (
    <Form
      navigationTitle={mode === "update" ? `Edit ${template.name}` : template.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Card Preview" icon={Icon.Stars} onSubmit={generate} />
          {secondaryActions}
        </ActionPanel>
      }
    >
      <Form.Description title="Template" text={template.name} />
      <Form.Description title="Deck" text={template.deckName} />
      {template.fields.length === 0 ? (
        <Form.Description title="Input" text="This template has no fields. Generate it as is." />
      ) : null}
      {warnings.map((warning, index) => (
        <Form.Description key={`${warning}-${index}`} title="Warning" text={warning} />
      ))}
      {template.fields.map((field, index) => {
        const title = index === 0 ? `${field.name} ★` : field.name;
        const info =
          index === 0 && isMochiTemplate ? "This is the card's primary field and sets its name in Mochi." : undefined;
        if (field.type === "boolean") {
          return (
            <Form.Checkbox
              key={field.id}
              id={field.id}
              title={title}
              info={info}
              label="Enabled"
              value={values[field.id] === true}
              onChange={(value) => {
                const next = { ...values, [field.id]: value };
                setValues(next);
                onValuesChange?.(next);
              }}
            />
          );
        }
        const props = {
          id: field.id,
          title,
          info,
          placeholder: field.required ? "Required" : "Optional",
          value: String(values[field.id] ?? ""),
          error: errors[field.id],
          onChange: (value: string) => {
            const next = { ...values, [field.id]: value };
            setValues(next);
            onValuesChange?.(next);
            if (errors[field.id]) {
              setErrors((current) => {
                const remaining = { ...current };
                delete remaining[field.id];
                return remaining;
              });
            }
          },
        };
        const input =
          field.type === "text" && field.multiline ? <Form.TextArea {...props} /> : <Form.TextField {...props} />;
        return (
          <Fragment key={field.id}>
            {input}
            {index === 0 && isMochiTemplate && duplicate ? (
              <Form.Description text={`⚠️ A card named "${duplicate.name}" already exists in this deck.`} />
            ) : null}
          </Fragment>
        );
      })}
    </Form>
  );
}
