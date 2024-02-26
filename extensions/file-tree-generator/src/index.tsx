import { Form, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";
import { parseInput } from "./parse-input";
import { GenerateTreeOptions, generateTree } from "./generate-tree";

export default function Command() {
  const [description, setDescription] = useState<string>("");
  const [options, setOptions] = useState<GenerateTreeOptions>({
    charset: "utf-8",
    trailingDirSlash: true,
    fullPath: false,
    rootDot: false,
  });

  const onDropdownChange = (value: string) => {
    if (value === "ascii" || value === "utf-8") setOptions({ ...options, charset: value });
  };

  const onCheckboxChange = (id: string) => {
    return (value: boolean) => setOptions({ ...options, [id]: value });
  };

  const onDescriptionChange = (value: string) => {
    setDescription(value);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Output" content={generateTree(parseInput(description), options)} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="input" title="Input" value={description} onChange={onDescriptionChange} />
      <Form.Dropdown id="charset" title="Charset" value={options.charset} onChange={onDropdownChange} storeValue>
        <Form.Dropdown.Item value="ascii" title="ASCII" />
        <Form.Dropdown.Item value="utf-8" title="UTF-8" />
      </Form.Dropdown>
      <Form.Checkbox
        id="trailingDirSlash"
        label="Show Trailing /"
        value={options.trailingDirSlash}
        onChange={onCheckboxChange("trailingDirSlash")}
      />
      <Form.Checkbox
        id="fullPath"
        label="Show Full Path"
        value={options.fullPath}
        onChange={onCheckboxChange("fullPath")}
        storeValue
      />
      <Form.Checkbox
        id="rootDot"
        label="Show Root ."
        value={options.rootDot}
        onChange={onCheckboxChange("rootDot")}
        storeValue
      />
      <Form.TextArea id="output" title="Output" value={generateTree(parseInput(description), options)} />
    </Form>
  );
}
