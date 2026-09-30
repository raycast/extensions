import { Form, ActionPanel, Action, Clipboard, popToRoot, showHUD, getSelectedText, LocalStorage } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import svg64 from "svg64";
import { useEffect, useState } from "react";

export default function Command() {
  let [format, setFormat] = useState("Raw");

  useEffect(() => {
    (async () => {
      let format = await LocalStorage.getItem("svg64format");

      setFormat(format);

      try {
        let selectedText = await getSelectedText();
        selectedText = selectedText.trim();
        setValue("svgText", selectedText);
      } catch (e) {
        console.log(e);
      }
    })();
  }, [format]);

  const { handleSubmit, itemProps, setValue } = useForm({
    onSubmit(values) {
      let base64 = svg64(values.svgText);
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
      svgText: FormValidation.Required,
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
        title="XML for SVG"
        text="The validity of the SVG is not checked, as all strings can be encoded into base64. You must ensure the SVG you are loading is already correct."
      />
      <Form.TextArea placeholder="Your SVG here..." {...itemProps.svgText} />

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
