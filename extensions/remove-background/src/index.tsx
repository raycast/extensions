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
import { useRef, useState } from "react";
import { accessSync, constants, existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, parse } from "path";
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

    // Leonardo.Ai always returns PNG, so the output gets a .png extension.
    const outputName = `removed-${parse(file).name}.png`;
    const outputDir = dirname(file);
    const outputFile = join(outputDir, outputName);

    if (existsSync(outputFile)) {
      return reject("Output file already exists");
    }

    // Every call is billed, so make sure the image can be read and the result saved before sending it.
    let image: Buffer;
    try {
      image = readFileSync(file);
    } catch (error) {
      const { code, message } = error as NodeJS.ErrnoException;
      return reject(code === "EISDIR" ? "That is a folder, not an image file" : `Could not read the image: ${message}`);
    }
    try {
      accessSync(outputDir, constants.W_OK);
    } catch {
      return reject(`Cannot save the result: ${outputDir} is not writable`);
    }

    return removeBackground({
      apiKey: preferences.leonardoApiKey,
      image,
      scale: "original",
      size,
      crop,
      type,
    })
      .then((result) => {
        writeFileSync(outputFile, result, { flag: "wx" });
        showToast(ToastStyle.Success, `Image saved as ${outputName}`);

        resolve(result.toString("base64"));
      })
      .catch((error: NodeJS.ErrnoException) => {
        reject(error.code === "EEXIST" ? "Output file already exists" : error.message);
      });
  });
};

export default function Command() {
  const submitting = useRef(false);
  const [isLoading, setLoading] = useState(false);
  const [base64, setBase64] = useState<string>();
  const [input, setInput] = useState<string>("");

  function handleSubmit(input: CommandForm) {
    // Each request is billed, so ignore a second submit while one is running.
    if (submitting.current) {
      return;
    }
    submitting.current = true;
    setLoading(true);

    processFile(input)
      .then(setBase64)
      .catch((error: string) => {
        showToast(ToastStyle.Failure, error);
      })
      .finally(() => {
        submitting.current = false;
        setLoading(false);
      });
  }

  if (base64) {
    return <Detail markdown={`![image](data:image/png;base64,${base64})`} />;
  }

  return (
    <Form
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
