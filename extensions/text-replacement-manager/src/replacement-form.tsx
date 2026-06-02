import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useMemo } from "react";

import type { ReplacementInput, TextReplacement } from "./lib/types";
import {
  applyTagSuggestion,
  normalizeTags,
  suggestTags,
  triggerPattern,
} from "./lib/validation";

interface ReplacementFormValues {
  trigger: string;
  replacementText: string;
  tags: string;
}

export function ReplacementForm(props: {
  title: string;
  submitTitle: string;
  existing: TextReplacement[];
  initialReplacement?: TextReplacement;
  forceCreate?: boolean;
  isLoading?: boolean;
  onSubmit(input: ReplacementInput): Promise<void>;
}) {
  const { pop } = useNavigation();
  const editingUuid = props.forceCreate
    ? undefined
    : props.initialReplacement?.uuid;
  const existingTags = useMemo(() => {
    return [...new Set(props.existing.flatMap((item) => item.tags))].sort(
      (a, b) => a.localeCompare(b),
    );
  }, [props.existing]);
  const { handleSubmit, itemProps, values, setValue, focus } =
    useForm<ReplacementFormValues>({
      initialValues: {
        trigger: props.initialReplacement?.trigger ?? "",
        replacementText: props.initialReplacement?.replacementText ?? "",
        tags: props.initialReplacement?.tags.join(", ") ?? "",
      },
      validation: {
        trigger: (value) => {
          const trigger = value?.trim() ?? "";
          if (!triggerPattern.test(trigger)) {
            return "Trigger must be 1-64 non-whitespace characters.";
          }
          if (
            props.existing.some(
              (item) =>
                item.trigger === trigger &&
                item.uuid !== editingUuid &&
                item.replacementText !== values.replacementText,
            )
          ) {
            return "Trigger must be unique.";
          }
        },
        replacementText: FormValidation.Required,
      },
      async onSubmit(values) {
        await props.onSubmit({
          trigger: values.trigger,
          replacementText: values.replacementText,
          tags: normalizeTags(values.tags),
        });
        pop();
      },
    });
  const tagSuggestions = useMemo(
    () => suggestTags(values.tags, existingTags),
    [existingTags, values.tags],
  );
  const topTagSuggestion = tagSuggestions[0];

  function acceptTagSuggestion(tag: string) {
    setValue("tags", applyTagSuggestion(values.tags, tag));
    focus("tags");
  }

  return (
    <Form
      isLoading={props.isLoading}
      navigationTitle={props.title}
      actions={
        <ActionPanel>
          {topTagSuggestion ? (
            <Action
              icon={Icon.Plus}
              title={`Use Tag "${topTagSuggestion}"`}
              shortcut={{ modifiers: [], key: "return" }}
              onAction={() => acceptTagSuggestion(topTagSuggestion)}
            />
          ) : null}
          <Action.SubmitForm
            icon={Icon.CheckCircle}
            title={props.submitTitle}
            shortcut={{ modifiers: [], key: "return" }}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Trigger"
        placeholder="omw"
        {...itemProps.trigger}
      />
      <Form.TextArea
        title="Replacement Text"
        placeholder="On my way!"
        {...itemProps.replacementText}
      />
      <Form.TextField
        title="Tags"
        placeholder="personal, travel"
        {...itemProps.tags}
      />
      {tagSuggestions.length ? (
        <Form.Description
          title="Matching Tags"
          text={tagSuggestions.join(", ")}
        />
      ) : null}
    </Form>
  );
}
