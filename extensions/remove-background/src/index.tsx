import {
  Form,
  ActionPanel,
  SubmitFormAction,
  showToast,
  ToastStyle,
  getPreferenceValues,
  Detail,
  Icon,
} from "@raycast/api";
import { useState } from "react";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { removeBackground } from "./leonardo";
import { Action$ } from "raycast-toolkit";

interface CommandForm {
  file: string;
  size: "preview" | "full" | "auto";
  type: "auto" | "person" | "product" | "car";
  crop: boolean;
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

    return removeBackground({
      apiKey: preferences.leonardoApiKey,
      image: readFileSync(file),
      scale: "original",
      size,
      crop,
      type,
    })
      .then((image) => {
        writeFileSync(outputFile, image);
        showToast(ToastStyle.Success, `Image saved as removed-${fileName}`);

        resolve(image.toString("base64"));
      })
      .catch((error: Error) => {
        reject(error.message);
      });
  });
};

export default function Command() {
  const [isLoading, setLoading] = useState(false);
  const [base64, setBase64] = useState<string>();
  const [input, setInput] = useState<string>("");

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
      navigationTitle={isLoading ? "🤖 Processing your image hang on..." : "Remove Background"}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <SubmitFormAction onSubmit={handleSubmit} />
          <Action$.SelectFile
            icon={Icon.Finder}
            title="Select Image From Finder..."
            prompt="Please select an image"
            type="public.image"
            shortcut={{ key: "o", modifiers: ["cmd"] }}
            onSelect={setInput}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="file"
        title="Select image"
        value={input}
        onChange={setInput}
        placeholder="Enter the file path, or press ⌘ O"
      />
      <Form.Checkbox id="crop" label="Crop" defaultValue={false} />
      <Form.Dropdown id="size" title="Output image resolution" defaultValue="preview">
        <Form.Dropdown.Item value="preview" title="Preview" />
        <Form.Dropdown.Item value="full" title="Full" />
        <Form.Dropdown.Item value="auto" title="Auto" />
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
