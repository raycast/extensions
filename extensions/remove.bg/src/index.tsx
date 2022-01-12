import { Form, ActionPanel, SubmitFormAction, showToast, ToastStyle, getPreferenceValues, Detail } from "@raycast/api";
import { useState } from "react";
import { removeBackgroundFromImageFile, RemoveBgError, RemoveBgResult } from "remove.bg";
import { existsSync } from "fs";

interface CommandForm {
  file: string;
  size: "preview" | "small" | "regular" | "medium" | "full" | "auto" | "hd" | "4k";
  type: "auto" | "person" | "product" | "car";
  crop: boolean;
}

const processFile = ({ file, size, type, crop }: CommandForm): Promise<string> => {
  const preferences = getPreferenceValues();

  if (!existsSync(file)) {
    return Promise.reject(showToast(ToastStyle.Failure, "File does not exist"));
  }

  const parts = file.split("/");
  const fileName = parts.pop();
  const outputFile = `${parts.join("/")}/removed-${fileName}`;

  if (existsSync(outputFile)) {
    return Promise.reject(showToast(ToastStyle.Failure, "Output file already exists"));
  }

  return removeBackgroundFromImageFile({
    path: file,
    apiKey: preferences.apiKey,
    scale: "original",
    size,
    crop,
    type,
    outputFile,
  })
    .then(({ base64img }: RemoveBgResult) => {
      showToast(ToastStyle.Success, `Image saved as removed-${fileName}`);

      return base64img;
    })
    .catch((errors: Array<RemoveBgError>) => {
      showToast(ToastStyle.Failure, errors[0].title);
      return errors[0].title;
    });
};

export default function Command() {
  const [isLoading, setLoading] = useState(false);
  const [base64, setBase64] = useState<string>();

  function handleSubmit(input: CommandForm) {
    setLoading(true);

    processFile(input)
      .then(setBase64)
      .finally(() => {
        setLoading(false);
      });
  }

  if (base64) {
    return <Detail markdown={`![image](data:image/png;base64,${base64})`} />;
  }

  return (
    <Form
      navigationTitle={isLoading ? "🤖 Processing your image hang on..." : "remove.bg"}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <SubmitFormAction onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="file"
        title="Select image"
        placeholder="Focus here, start dragging, press cmd+space release here"
      />
      <Form.Checkbox id="crop" label="Crop" defaultValue={false} />
      <Form.Dropdown id="size" title="Output image resolution" defaultValue="regular">
        <Form.Dropdown.Item value="preview" title="Preview" />
        <Form.Dropdown.Item value="small" title="Small" />
        <Form.Dropdown.Item value="regular" title="Regular" />
        <Form.Dropdown.Item value="medium" title="Medium" />
        <Form.Dropdown.Item value="full" title="Full" />
        <Form.Dropdown.Item value="auto" title="Auto" />
        <Form.Dropdown.Item value="hd" title="HD" />
        <Form.Dropdown.Item value="4k" title="4k" />
      </Form.Dropdown>
      <Form.Dropdown id="type" title="Object you want to extract" defaultValue="auto">
        <Form.Dropdown.Item value="auto" title="Auto" />
        <Form.Dropdown.Item value="person" title="Person" />
        <Form.Dropdown.Item value="product" title="Product" />
        <Form.Dropdown.Item value="car" title="Car" />
      </Form.Dropdown>
    </Form>
  );
}
