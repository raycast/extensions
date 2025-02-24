import { ActionPanel, Form, Action, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { Jimp } from "jimp";
import { useImagesForm } from "./hooks/use-image-form";

export default function Command() {
  const { handleSubmit, diffImage, fields } = useImagesForm();
  const [markdown, setMarkdown] = useState<string>("");

  useEffect(() => {
    if (!diffImage) return;
    const handleSetDiffImage = async () => {
      const { width, height, diffBuffer } = await diffImage;
      const diffJimpImage = await new Jimp({ data: diffBuffer, width, height });
      const base64Image = await diffJimpImage.getBase64("image/png");
      setMarkdown(`![](${base64Image})`);
    };

    handleSetDiffImage();
  }, [diffImage]);

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Run" onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.FilePicker
          title="actual"
          allowMultipleSelection={false}
          info="Only files with the extensions .png, .jpeg, .jpg, and .gif are supported."
          {...fields.actual}
        />
        <Form.FilePicker
          title="expected"
          allowMultipleSelection={false}
          info="Only files with the extensions .png, .jpeg, .jpg, and .gif are supported."
          {...fields.expected}
        />
      </Form>
      {markdown && <Detail markdown={markdown} />}
    </>
  );
}
