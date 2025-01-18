import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation, usePromise } from "@raycast/utils";
import { getSavedItems, setSavedItems } from "../utilities/storage";
import { RegexItem, ReplacementOption } from "../types";
import { Fragment, useState } from "react";
import { nanoid } from "nanoid";
export interface RegexItemFormProps {
  initialValues: ReplacementOption;
  isNew?: boolean;
}

export default function RegexItemForm({ initialValues, isNew }: RegexItemFormProps) {
  const { pop } = useNavigation();

  const emptyRegexItem: RegexItem = { regex: "", key: "", id: nanoid() };
  const { data: replacementOptions, isLoading } = usePromise(getSavedItems);
  const [regexItems, setRegexItems] = useState<RegexItem[]>(initialValues?.regexItems || [emptyRegexItem]);

  function addReplacementItem() {
    setRegexItems((prev) => [...prev, emptyRegexItem]);
  }

  function updateRegexItem(index: number, updatedItem: RegexItem) {
    setRegexItems((prev) => prev.map((item, idx) => (idx === index ? updatedItem : item)));
  }

  const { handleSubmit, itemProps } = useForm<ReplacementOption>({
    initialValues,
    onSubmit(values) {
      if (isNew || !replacementOptions || replacementOptions.length < 1) {
        replacementOptions?.push({
          ...values,
          id: nanoid(),
          regexItems,
        });
      } else {
        const itemIndex = replacementOptions?.findIndex((e) => e.id === initialValues.id);
        replacementOptions[itemIndex] = {
          ...values,
          id: initialValues.id,
          regexItems,
        };
      }
      setSavedItems(replacementOptions);

      showToast({
        style: Toast.Style.Success,
        title: "Success!",
        message: `New Regex Option created: ${values.title} (${values.description})`,
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
      },
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
          <Action
            title="Add Replacement Item"
            onAction={addReplacementItem}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="My best regex ever" {...itemProps.title} />
      <Form.TextArea
        title="Description"
        placeholder="Take the description and wrap it in a <strong> tag"
        {...itemProps.description}
      />
      <Form.Separator />

      {regexItems.map((option, index) => (
        <Fragment key={option.id}>
          <Form.Description text={"Item " + (index + 1)} />
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
