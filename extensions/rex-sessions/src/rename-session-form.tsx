import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { SESSION_LABEL_MAX_LENGTH, validateSessionLabel } from "./lib/session-label";

export type RenameSessionHandler = (label: string) => Promise<void>;

interface RenameSessionFormProps {
  currentLabel: string;
  onRename: RenameSessionHandler;
  onSessionRenamed?: () => Promise<unknown> | unknown;
}

export function RenameSessionForm({ currentLabel, onRename, onSessionRenamed }: RenameSessionFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState(currentLabel);
  const [nameError, setNameError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) {
      return false;
    }

    const validation = validateSessionLabel(name);
    if (validation.error) {
      setNameError(validation.error);
      return false;
    }

    if (validation.label === currentLabel.trim()) {
      pop();
      return;
    }

    setNameError(undefined);
    setIsSubmitting(true);

    try {
      await onRename(validation.label);
      await Promise.resolve(onSessionRenamed?.()).catch(() => undefined);
      pop();
    } catch (renameError) {
      // Keep the form open so the name can be corrected or retried.
      await showFailureToast(renameError, { title: "Could Not Rename Session" });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      navigationTitle="Rename Session"
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Session" icon={Icon.Pencil} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="e.g. Work"
        autoFocus
        value={name}
        error={nameError}
        onChange={(value) => {
          setName(value);
          if (nameError) {
            setNameError(undefined);
          }
        }}
      />
      <Form.Description
        title={`Up to ${SESSION_LABEL_MAX_LENGTH} characters`}
        text="Changes the name shown for this session in the list."
      />
    </Form>
  );
}
