import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  getPreferenceValues,
  Icon,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { createPaste } from "./lib/privatebin";
import { generatePassword, isMarkdown } from "./lib/tools";
import * as fs from "node:fs";
import { useEffect } from "react";

interface PasteDataForm {
  pasteData: string;
  password: string;
  expire: string;
  burnAfterRead: boolean;
  format: string;
  attachment: string[];
}

export default function Command() {
  const expirations = {
    "5min": "5 minutes",
    "10min": "10 minutes",
    "1hour": "1 hour",
    "1day": "1 day",
    "1week": "1 week",
    "1month": "1 month",
    "1year": "1 year",
    never: "Never",
  };
  const formats = { plaintext: "Plain Text", syntaxhighlighting: "Source Code", markdown: "Markdown" };

  const { url, includePassword } = getPreferenceValues();

  const { handleSubmit, itemProps, setValue, values } = useForm<PasteDataForm>({
    onSubmit: async (values) => {
      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Encrypting data...",
        });

        let filePath: string | null = values.attachment[0] ?? null;
        if (filePath && (!fs.existsSync(filePath) || !fs.lstatSync(filePath).isFile())) {
          filePath = null;
        }

        const { id, pasteKey } = await createPaste(
          values.pasteData,
          values.expire,
          values.password,
          values.burnAfterRead,
          filePath,
        );

        let copyText = `${url.replace(/\/+$/, "")}/?${id}#${pasteKey}`;
        if (includePassword && values.password) {
          copyText = `${copyText}\nPassword: ${values.password}`;
        }

        await Clipboard.copy(copyText);

        await showToast({
          style: Toast.Style.Success,
          title: "Share URL copied to clipboard",
        });
      } catch (e) {
        await showFailureToast(e, { title: "Could not create the Paste" });
      }

      await popToRoot();
    },
    validation: {
      pasteData: FormValidation.Required,
      expire: FormValidation.Required,
      format: FormValidation.Required,
      attachment: (value) => (value && value?.length > 1 ? "Maximum 1 attachment can be selected" : undefined),
    },
    initialValues: {
      expire: "1day",
      format: "plaintext",
    },
  });

  const createAndCopyPassword = async () => {
    const password = generatePassword(8);
    setValue("password", password);
    await showToast({
      style: Toast.Style.Success,
      title: "Password created" + (includePassword ? "" : " and copied to clipboard"),
    });
    if (!includePassword) {
      await Clipboard.copy(password);
    }
  };

  useEffect(() => {
    if (values.format === "plaintext" && isMarkdown(values.pasteData)) {
      setValue("format", "markdown");
      showToast({
        style: Toast.Style.Success,
        title: "Markdown detected. Changed the format of the paste",
      });
    }
  }, [values.pasteData]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Paste and Copy Link" onSubmit={handleSubmit} icon={Icon.NewDocument} />
          <Action
            onAction={createAndCopyPassword}
            title={includePassword ? "Generate Password" : "Generate and Copy Password"}
            icon={Icon.Key}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Your data" {...itemProps.pasteData} />
      <Form.PasswordField title="Password" {...itemProps.password} placeholder="Password (optional)" />
      <Form.Dropdown title="Expiration" {...itemProps.expire}>
        {Object.entries(expirations).map(([value, label]) => (
          <Form.Dropdown.Item key={value} value={value} title={label} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Format" {...itemProps.format}>
        {Object.entries(formats).map(([value, label]) => (
          <Form.Dropdown.Item key={value} value={value} title={label} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox label="Burn after reading" {...itemProps.burnAfterRead} />
      <Form.FilePicker title="Attachment" {...itemProps.attachment} allowMultipleSelection={false} />
    </Form>
  );
}
