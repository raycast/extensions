import { Form, ActionPanel, SubmitFormAction, showToast, ToastStyle, getPreferenceValues, Detail } from "@raycast/api";
import { useState } from "react";
import { removeBackgroundFromImageFile, RemoveBgError, RemoveBgResult } from "remove.bg";
import { existsSync } from "fs";

interface CommandForm {
  file: string;
  size: "preview" | "small" | "regular" | "medium" | "full" | "auto" | "hd" | "4k";
  type: "auto" | "person" | "product" | "car";
  crop: number;
}

const processFile = ({ file, size, type, crop }: CommandForm): Promise<string> => {
  const preferences = getPreferenceValues();

  return new Promise((resolve, reject) => {
    if (!existsSync(file)) {
      return reject("File does not exist");
    }

    const parts = file.split("/");
    const fileName = parts.pop();
    const outputFile = `${parts.join("/")}/removed-${fileName}`;

    if (existsSync(outputFile)) {
      return reject("Output file already exists");
    }

    return removeBackgroundFromImageFile({
      path: file,
      apiKey: preferences.apiKey,
      scale: "original",
      size,
      crop: crop === 1,
      type,
      outputFile,
    })
      .then(({ base64img }: RemoveBgResult) => {
        showToast(ToastStyle.Success, `Image saved as removed-${fileName}`);

        resolve(base64img);
      })
      .catch((errors: Array<RemoveBgError>) => {
        reject(errors[0].title);
      });
  });
};

export default function Command() {
  const [isLoading, setLoading] = useState(false);
  const [base64, setBase64] = useState<string>();

  function handleSubmit(input: CommandForm) {
    setLoading(true);

    processFile(input)
      .then(setBase64)
      .catch((error: string) => {
        showToast(ToastStyle.Failure, error);
      })
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
