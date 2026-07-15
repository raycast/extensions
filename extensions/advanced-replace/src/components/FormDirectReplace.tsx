import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation, usePromise } from "@raycast/utils";
import { getSavedItems, setSavedItems } from "../utilities/storage";
import { EntryDirectReplace, RegexItemDirectReplace } from "../types";
import { nanoid } from "nanoid";
import { Fragment, PropsWithChildren, useState } from "react";

function createEmptyRegexItem(): RegexItemDirectReplace {
  return {
    id: nanoid(),
    regex: "",
    replacement: "",
    matchCaseInsensitive: false,
    matchGlobally: true,
    matchMultiline: true,
  };
}

export interface FormDirectReplaceProps extends PropsWithChildren {
  initialValues: EntryDirectReplace;
  isNew?: boolean;
}

export default function FormDirectReplace({ initialValues, isNew, children }: FormDirectReplaceProps) {
  const { pop } = useNavigation();

  const { data: replacementEntries, isLoading } = usePromise(getSavedItems);

  const [regexItems, setRegexItems] = useState<RegexItemDirectReplace[]>(
    initialValues?.regexItems || [createEmptyRegexItem()],
  );

  function addRegexItem() {
    setRegexItems((prev) => [...prev, createEmptyRegexItem()]);
  }

  function updateRegexItem(index: number, updatedItem: RegexItemDirectReplace) {
    setRegexItems((prev) => prev.map((item, idx) => (idx === index ? updatedItem : item)));
  }

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  function validateRequired(key: string, value: string) {
    setErrors((prev) => ({ ...prev, [key]: value ? undefined : "This field is required" }));
  }

  function clearErrorIfValid(key: string, value: string) {
    if (errors[key] && value) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  const { handleSubmit, itemProps } = useForm<EntryDirectReplace>({
    initialValues,
    async onSubmit(values) {
      const nextErrors: Record<string, string> = {};
      regexItems.forEach((item) => {
        if (!item.regex) nextErrors[item.id + ":regex"] = "This field is required";
        if (!item.replacement) nextErrors[item.id + ":replacement"] = "This field is required";
      });
      if (Object.keys(nextErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...nextErrors }));
        return;
      }

      if (isNew || !replacementEntries || replacementEntries.length < 1) {
        (replacementEntries ?? []).push({
          ...values,
          id: nanoid(),
          type: "directReplace",
          lastUsed: new Date(),
          regexItems,
        });
      } else {
        const itemIndex = replacementEntries?.findIndex((e) => e.id === initialValues.id);
        if (itemIndex === -1) {
          showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: "Could not find item to update",
          });
          return;
        }
        replacementEntries[itemIndex] = {
          ...values,
          id: initialValues.id,
          type: "directReplace",
          regexItems,
        } as EntryDirectReplace;
      }
      await setSavedItems(replacementEntries);

      showToast({
        style: Toast.Style.Success,
        title: "Success!",
        message: `${isNew ? "New" : "Updated"} Regex Option: ${values.title}${values.description ? ` (${values.description})` : ""}`,
      });

      pop();
    },
    validation: {
      title: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
          <Action title="Add Replacement Item" onAction={addRegexItem} shortcut={{ modifiers: ["cmd"], key: "n" }} />
        </ActionPanel>
      }
    >
      {children}
      <Form.TextField title="Title" placeholder="My best regex ever" {...itemProps.title} />
      <Form.TextArea
        title="Description"
        placeholder="Take the description and wrap it in a <strong> tag"
        {...itemProps.description}
      />
      <Form.Separator />
      {regexItems.map((option, index) => (
        <Fragment key={option.id}>
          {regexItems.length > 1 && <Form.Description text={"Item " + (index + 1)} />}
          <Form.TextField
            title="Regex"
            placeholder="e.g. \s+"
            id={option.id + "regex"}
            value={option.regex}
            error={errors[option.id + ":regex"]}
            onChange={(newValue) => {
              updateRegexItem(index, { ...option, regex: newValue });
              clearErrorIfValid(option.id + ":regex", newValue);
            }}
            onBlur={(event) => validateRequired(option.id + ":regex", event.target.value ?? "")}
          />
          <Form.TextArea
            title="Replace with"
            placeholder="e.g. -"
            id={option.id + "replacement"}
            value={option.replacement}
            error={errors[option.id + ":replacement"]}
            onChange={(newValue) => {
              updateRegexItem(index, { ...option, replacement: newValue });
              clearErrorIfValid(option.id + ":replacement", newValue);
            }}
            onBlur={(event) => validateRequired(option.id + ":replacement", event.target.value ?? "")}
          />
          <Form.Checkbox
            label="Global match"
            id={option.id + "matchGlobally"}
            value={option.matchGlobally}
            onChange={(newValue) => updateRegexItem(index, { ...option, matchGlobally: newValue })}
          />
          <Form.Checkbox
            label="Multiline"
            id={option.id + "matchMultiline"}
            value={option.matchMultiline}
            onChange={(newValue) => updateRegexItem(index, { ...option, matchMultiline: newValue })}
          />
          <Form.Checkbox
            label="Case Insensitive"
            id={option.id + "matchCaseInsensitive"}
            value={option.matchCaseInsensitive}
            onChange={(newValue) => updateRegexItem(index, { ...option, matchCaseInsensitive: newValue })}
          />
        </Fragment>
      ))}
    </Form>
  );
}
