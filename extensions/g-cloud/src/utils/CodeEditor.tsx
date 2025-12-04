import React, { useState, useEffect } from "react";
import { Detail, ActionPanel, Action, Icon, Form, useNavigation } from "@raycast/api";

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  language?: "javascript" | "typescript" | "json" | "html" | "css";
  title?: string;
  onSave?: (code: string) => void;
  onCancel?: () => void;
}

export function CodeEditor({
  code,
  onChange,
  language = "javascript",
  title = "Code Editor",
  onSave,
  onCancel,
}: CodeEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState(code);
  const { pop } = useNavigation();

  useEffect(() => {
    if (!isEditing) {
      setEditedCode(code);
    }
  }, [code, isEditing]);

  const handleSave = async () => {
    if (onSave) {
      await onSave(editedCode);
    } else {
      onChange(editedCode);
    }
    setIsEditing(false);
  };

  const handleCancel = async () => {
    setEditedCode(code);
    setIsEditing(false);
    if (onCancel) {
      await onCancel();
    }
  };

  if (isEditing) {
    return (
      <Form
        navigationTitle={`Edit ${title}`}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Save"
              icon={Icon.Check}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onSubmit={handleSave}
            />
            <Action
              title="Cancel"
              icon={Icon.XmarkCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={handleCancel}
            />
          </ActionPanel>
        }
      >
        <Form.TextArea
          id="code"
          title="Code"
          placeholder="Enter your code here"
          value={editedCode}
          onChange={setEditedCode}
          enableMarkdown={false}
          autoFocus
        />
      </Form>
    );
  }

  return (
    <Detail
      navigationTitle={title}
      markdown={`\`\`\`${language}\n${editedCode}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action
            title="Edit"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={() => setIsEditing(true)}
          />
          {onSave && (
            <Action
              title="Save"
              icon={Icon.Check}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              onAction={async () => {
                if (onSave) await onSave(editedCode);
                pop();
              }}
            />
          )}
          {onCancel && (
            <Action
              title="Cancel"
              icon={Icon.XmarkCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={async () => {
                if (onCancel) await onCancel();
                setEditedCode(code);
                pop();
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
