import { Action, ActionPanel, Form, Icon, showToast, ToastStyle } from "@raycast/api";
import React, { useState } from "react";
import { IAction } from "../constants/initialActions";

interface AddActionFormProps {
  addAction: (action: IAction) => Promise<void>;
  onAdd: () => void;
}

export default function AddActionForm({ addAction, onAdd }: AddActionFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<keyof typeof Icon>("Paragraph");
  const [prompt, setPrompt] = useState("");

  const handleSave = async () => {
    const id = Date.now().toString();
    const action: IAction = { id, title, description, icon, prompt };
    await addAction(action);
    showToast(ToastStyle.Success, "IAction saved!");
    onAdd();
  };

  const iconOptions = Object.keys(Icon).map((key) => <Form.Dropdown.Item key={key} value={key} title={key} />);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Save IAction" onAction={handleSave} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Enter title" value={title} onChange={setTitle} />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Enter description"
        value={description}
        onChange={setDescription}
      />
      <Form.Dropdown
        id="icon"
        title="Icon"
        value={icon}
        onChange={(newValue) => setIcon(newValue as keyof typeof Icon)}
      >
        {iconOptions}
      </Form.Dropdown>
      <Form.TextArea id="prompt" title="Prompt" placeholder="Enter prompt" value={prompt} onChange={setPrompt} />
    </Form>
  );
}
