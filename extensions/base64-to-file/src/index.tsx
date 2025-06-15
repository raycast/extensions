import { Form, ActionPanel, Action, showToast, Toast, LocalStorage, showInFinder } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { createWriteStream } from "fs";
import { useEffect, useState } from "react";
import { homedir } from "os";

type ConvertFormValues = {
  base64: string;
  filePath: string;
};

export default function Command() {
  const storageKey = "convertBase64ToFile";
  const defaultFilePath = `${homedir()}/Downloads/out.pdf`;
  const [state, setState] = useState<ConvertFormValues>({
    base64: "",
    filePath: defaultFilePath,
  });

  const base64ToBlob = (base64Text: string) => {
    const byteCharacters = atob(base64Text);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray]);
  };

  const writeFile = async (filePath: string, blob: Blob) => {
    return new Promise((resolve, reject) => {
      const writableStream = createWriteStream(filePath);
      blob
        .arrayBuffer()
        .then((buffer) => {
          writableStream.write(Buffer.from(buffer));
          writableStream.end();
        })
        .catch(reject);
      writableStream.on("finish", resolve);
      writableStream.on("error", reject);
    });
  };

  useEffect(() => {
    (async () => {
      const storedConvertBase64ToFile = await LocalStorage.getItem<string>(storageKey);
      if (!storedConvertBase64ToFile) {
        return;
      }
      try {
        const values: ConvertFormValues = JSON.parse(storedConvertBase64ToFile);
        setState((previous) => ({ ...previous, ...values }));
      } catch (e) {
        setState((previous) => ({ ...previous, base64: "", filePath: defaultFilePath }));
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem(storageKey, JSON.stringify(state));
  }, [state]);

  const { handleSubmit } = useForm<ConvertFormValues>({
    async onSubmit(values) {
      try {
        const blob = base64ToBlob(values.base64);
        await writeFile(values.filePath, blob);
        showToast({
          style: Toast.Style.Success,
          title: "Error",
          message: `Converted successfully: ${values.filePath}`,
        });
        await showInFinder(values.filePath);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: `Failed: ${error}`,
        });
        console.log(error);
      }
    },
    validation: {
      base64: FormValidation.Required,
      filePath: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Convert" />
        </ActionPanel>
      }
    >
      <Form.Description text="Convert base64 to a file" />
      <Form.TextArea id="base64" title="Base64 Text" placeholder="Please enter the string encoded in base64" />
      <Form.TextField
        id="filePath"
        title="File Path"
        placeholder="Please enter the file path to convert to"
        defaultValue={defaultFilePath}
      />
    </Form>
  );
}
