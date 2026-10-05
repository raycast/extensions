import { Form, ActionPanel, Action, showToast, Icon, Toast, useNavigation } from "@raycast/api";
import { COLOR_KEYS, COLOR_MAP } from "../utils/colors";
import { useForm, FormValidation } from "@raycast/utils";
import { addLanguage, updateLanguage } from "../data/data";

type Values = {
  name: string;
  abbreviation?: string;
  color: string;
};

type Props = {
  mode: "add" | "edit";
  initial?: Values & { id: string };
};

export default function LanguageForm({ mode, initial }: Props) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit(values) {
      const abbreviation = values.abbreviation?.trim() || undefined;
      try {
        if (mode === "add") {
          addLanguage(values.name.trim(), values.color, abbreviation);
          await showToast({ style: Toast.Style.Success, title: "Success", message: `${values.name} language added` });
        } else if (mode === "edit") {
          if (!initial) throw new Error("Language is not selected for editing");
          updateLanguage(initial.id, {
            name: values.name.trim(),
            color: values.color,
            abbreviation,
          });
          await showToast({ style: Toast.Style.Success, title: "Success", message: `${values.name} language updated` });
        }
        pop();
      } catch (e) {
        await showToast({ style: Toast.Style.Failure, title: (e as Error).message });
      }
    },
    validation: {
      name: FormValidation.Required,
    },
    initialValues: {
      name: initial?.name,
      abbreviation: initial?.abbreviation,
      color: initial?.color ?? COLOR_KEYS[0],
    },
  });

  return (
    <Form
      navigationTitle={mode === "add" ? "Add Language" : "Edit Language"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={mode === "add" ? "Add Language" : "Update Language"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.name} title="Language" info="Name of the language" placeholder="e.g. Spanish" />
      <Form.TextField
        {...itemProps.abbreviation}
        title="Abbreviation"
        info="Abbreviation of the language name that will be displayed next to words in the notebook. If omitted, the full language name will be displayed."
        placeholder="e.g. es (optional)"
      />
      <Form.Dropdown {...itemProps.color} title="Color">
        {COLOR_KEYS.map((key) => (
          <Form.Dropdown.Item
            key={key}
            value={key}
            title={key}
            icon={{ source: Icon.Circle, tintColor: COLOR_MAP[key] }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
