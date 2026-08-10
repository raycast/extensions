import {
  Form,
  ActionPanel,
  Action,
  Clipboard,
  popToRoot,
  showHUD,
  getSelectedFinderItems,
  LocalStorage,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import svg64 from "svg64";
import { useEffect, useState } from "react";
import { readFileSync } from "fs";

export default function Command() {
  let [format, setFormat] = useState("Raw");

  useEffect(() => {
    (async () => {
      let format = await LocalStorage.getItem("svg64format");

      setFormat(format);

      try {
        let selectedFile = await getSelectedFinderItems();
        selectedFile = selectedFile[0].path;
        setValue("svgFile", [selectedFile]);
      } catch (e) {
        console.log(e);
      }
    })();
  }, [format]);

  const { handleSubmit, itemProps, setValue } = useForm({
    async onSubmit(values) {
      let file = readFileSync(values.svgFile[0], "utf-8");
      let base64 = svg64(file);
      (async () => {
        await LocalStorage.setItem("svg64format", values.format);
        console.log(values.format);
      })();

      switch (values.format) {
        case "Raw":
          Clipboard.copy(base64);
          break;
        case "CSS URL":
          Clipboard.copy(`url(${base64})`);
          break;
        case "Markdown":
          Clipboard.copy(`![](${base64})`);
          break;
      }

      popToRoot();
      showHUD("Result copied to clipboard.");
    },
    validation: {
      svgFile: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy Result" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="SVG File"
        text="The validity of the SVG is not checked, as all strings can be encoded into base64. You must ensure the SVG you are loading is already correct."
      />
      <Form.FilePicker title="" {...itemProps.svgFile} allowMultipleSelection={false} />

      <Form.Description
        title="Format"
        text={`Format of the copied string. This value is remembered for both File and Text input after you submit the form.

Raw: Copied as just Base64 string
CSS URL: Copied as url(Base64)
Markdown: Copied as ![](Base64)`}
      />
      <Form.Dropdown id="format" value={format} onChange={setFormat}>
        {["Raw", "CSS URL", "Markdown"].map((num) => {
          return <Form.Dropdown.Item value={String(num)} title={String(num)} key={num} />;
        })}
      </Form.Dropdown>
    </Form>
  );
}
