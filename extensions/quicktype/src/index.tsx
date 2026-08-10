import { Form, ActionPanel, Action, showToast, Toast, Clipboard, showHUD } from "@raycast/api";
import { CommandForm, FileTypeItem, QuickTypeFileTypes } from "./types";
import { quicktype, InputData, jsonInputForTargetLanguage } from "quicktype-core";

async function quicktypeJSON(targetLanguage: string, typeName: string, jsonstring: string) {
  const jsonInput = jsonInputForTargetLanguage(targetLanguage);

  await jsonInput.addSource({
    name: typeName,
    samples: [jsonstring],
  });

  const inputData = new InputData();
  inputData.addInput(jsonInput);

  return await quicktype({
    inputData,
    lang: targetLanguage,
  });
}

export default function Command() {
  async function convertJsonToSwift(values: CommandForm) {
    try {
      const { lines: dataModel } = await quicktypeJSON(values.dropdown, values.title, values.textarea);
      const generatedCode = dataModel.join("\n");

      Clipboard.copy(generatedCode);
      showHUD("Copied Code to Clipboard ✅");
    } catch (error: any) {
      await showToast({ style: Toast.Style.Failure, title: "Something Went Wrong", message: error.message });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert" onSubmit={convertJsonToSwift} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Model Name" placeholder="WeatherModel..." defaultValue="EmptyModel" />

      <Form.TextArea id="textarea" title="Raw JSON Data" placeholder="Paste JSON here..." />
      <Form.Separator />

      <Form.Dropdown id="dropdown" title="Language">
        {QuickTypeFileTypes.map((fileType) => (
          <FileTypeItem key={fileType.name} fileType={fileType} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
