import { Action, ActionPanel, Clipboard, Form, Icon, Image, showHUD } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useRef } from "react";
import { transformText } from "./utils/transformText";
import { Language, languages } from "./data";
import { useFrontmostApp } from "./hooks/useFrontmostApp";

interface FormValues {
  text: string;
  langFrom: string;
  langTo: string;
}

export default function main() {
  const { handleSubmit, itemProps, setValue, setValidationError } = useForm<FormValues>({
    initialValues: {
      text: "",
      langFrom: "eng",
      langTo: "ukr",
    },
    async onSubmit(values) {
      const transformedText = transformText({
        input: values.text,
        langFrom: values.langFrom as Language,
        langTo: values.langTo as Language,
      });

      if (action.current === "paste") {
        await Clipboard.paste(transformedText);
        await showHUD("Transformed text pasted to active app");
      } else if (action.current === "copy") {
        await Clipboard.copy(transformedText);
        await showHUD("Transformed text copied to clipboard");
      }
    },
    validation: {
      text: FormValidation.Required,
      langFrom: (value) => {
        if (value === itemProps.langTo.value) {
          return "Languages should be different";
        }
      },
      langTo: (value) => {
        if (value === itemProps.langFrom.value) {
          return "Languages should be different";
        }
      },
    },
  });

  function handleSwitchLanguages() {
    if (itemProps.langTo.value) {
      setValue("langFrom", itemProps.langTo.value);
    }

    if (itemProps.langFrom.value) {
      setValue("langTo", itemProps.langFrom.value);
    }
  }

  function handleLangChange(type: "from" | "to", newValue: string) {
    if (type === "from" && itemProps.langTo.value === newValue) {
      setValidationError("langFrom", "Languages should be different");
      setValidationError("langTo", "Languages should be different");
    } else if (type === "to" && itemProps.langFrom.value === newValue) {
      setValidationError("langFrom", "Languages should be different");
      setValidationError("langTo", "Languages should be different");
    } else {
      setValidationError("langFrom", null);
      setValidationError("langTo", null);
    }
  }

  const frontmostApp = useFrontmostApp();
  const action = useRef("");

  const pasteToAppTitle = `Paste to ${frontmostApp ? frontmostApp.name : "Active App"}`;
  const pasteToAppIcon: Image.ImageLike = frontmostApp ? { fileIcon: frontmostApp.path } : Icon.ArrowUp;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { onChange: onChangeFrom, ...langFromProps } = itemProps.langFrom;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { onChange: onChangeTo, ...langToProps } = itemProps.langTo;

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm
              title={pasteToAppTitle}
              icon={pasteToAppIcon}
              onSubmit={(values: FormValues) => {
                action.current = "paste";
                handleSubmit(values);
              }}
            />
            {itemProps.text && (
              <Action.SubmitForm
                title="Copy to Clipboard"
                icon={Icon.CopyClipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                onSubmit={(values: FormValues) => {
                  action.current = "copy";
                  handleSubmit(values);
                }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Switch Languages"
              icon={Icon.Switch}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              onAction={handleSwitchLanguages}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea title="Text" placeholder="Enter text here" {...itemProps.text} />

      <Form.Dropdown
        title="Language from"
        onChange={(newValue) => {
          handleLangChange("from", newValue);
          itemProps.langFrom.onChange?.(newValue);
        }}
        {...langFromProps}
      >
        {Object.entries(languages).map(([key, value]) => (
          <Form.Dropdown.Item key={key} value={value.id} title={value.label} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        title="Language to"
        onChange={(newValue) => {
          handleLangChange("to", newValue);
          itemProps.langTo.onChange?.(newValue);
        }}
        {...langToProps}
      >
        {Object.entries(languages).map(([key, value]) => (
          <Form.Dropdown.Item key={key} value={value.id} title={value.label} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
