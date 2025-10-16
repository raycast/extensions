import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation, usePromise } from "@raycast/utils";
import { getSavedItems, setSavedItems } from "../utilities/storage";
import { RegexItemCutPaste, EntryCutPaste } from "../types";
import { Fragment, PropsWithChildren, useState } from "react";
import { nanoid } from "nanoid";

function createEmptyRegexItem(): RegexItemCutPaste {
  return { regex: "", key: "", id: nanoid() };
}

export interface FormCutPasteProps extends PropsWithChildren {
  initialValues: EntryCutPaste;
  isNew?: boolean;
}

export default function FormCutPaste({ initialValues, isNew, children }: FormCutPasteProps) {
  const { pop } = useNavigation();

  const { data: replacementEntries, isLoading } = usePromise(getSavedItems);
  const [regexItems, setRegexItems] = useState<RegexItemCutPaste[]>(
    initialValues?.regexItems || [createEmptyRegexItem()],
  );

  function addRegexItem() {
    setRegexItems((prev) => [...prev, createEmptyRegexItem()]);
  }

  function updateRegexItem(index: number, updatedItem: RegexItemCutPaste) {
    setRegexItems((prev) => prev.map((item, idx) => (idx === index ? updatedItem : item)));
  }

  const { handleSubmit, itemProps } = useForm<EntryCutPaste>({
    initialValues,
    onSubmit(values) {
      if (isNew || !replacementEntries || replacementEntries.length < 1) {
        (replacementEntries ?? []).push({
          ...values,
          id: nanoid(),
          type: "cutPaste",
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
          type: "cutPaste",
          lastUsed: new Date(),
          regexItems,
        };
      }
      setSavedItems(replacementEntries);

      showToast({
        style: Toast.Style.Success,
        title: "Success!",
        message: `${isNew ? "New" : "Updated"} Regex Option: ${values.title} (${values.description})`,
      });

      pop();
    },
    validation: {
      title: FormValidation.Required,
      output: FormValidation.Required,
      regexItems: () => {
        const invalidRegexItem = regexItems.find((item) => !item.key || !item.regex);
        if (invalidRegexItem) {
          return "Each Regex item requires both a key and a regex pattern.";
        }
        return undefined;
      },
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
          {regexItems?.length > 1 && <Form.Description text={"Item " + (index + 1)} />}
          <Form.TextField
            id={option.id}
            title="Key"
            info="Use the Key name (e.g. KEY) without enclosing curly braces."
            placeholder="Enter key for regex item, e.g. KEY"
            value={option.key}
            onChange={(newValue) => updateRegexItem(index, { ...option, key: newValue })}
          />
          <Form.TextField
            id={"regex" + index}
            title="Regex"
            placeholder='e.g. description="(.*)"'
            value={option.regex}
            onChange={(newValue) => updateRegexItem(index, { ...option, regex: newValue })}
          />
        </Fragment>
      ))}
      <Form.TextArea
        title="Output"
        info="Use regex capture groups to insert string that was matched."
        placeholder="<strong>{value}</strong>"
        {...itemProps.output}
      />
    </Form>
  );
}
