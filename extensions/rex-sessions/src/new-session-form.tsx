import { Action, ActionPanel, closeMainWindow, Form, Icon, PopToRootType, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { createSession, getAppClient, selectSession } from "./lib/rex";
import { SESSION_LABEL_MAX_LENGTH, validateSessionLabel } from "./lib/session-label";

interface NewSessionFormProps {
  onSessionCreated?: () => Promise<unknown> | unknown;
}

export function NewSessionForm({ onSessionCreated }: NewSessionFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
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

    setNameError(undefined);
    setIsSubmitting(true);

    try {
      // Resolve the Windows app client first so a failure here does not leave an orphaned session behind.
      const client = process.platform === "darwin" ? undefined : await getAppClient();
      const sessionId = await createSession(validation.label);

      try {
        await selectSession(client?.client_id, sessionId);
      } catch (openError) {
        await showFailureToast(openError, {
          title: `Created “${validation.label}”, but could not open it`,
          message: "The session exists in Rex. Open it from the session list instead.",
        });
        await Promise.resolve(onSessionCreated?.()).catch(() => undefined);
        pop();
        return;
      }

      await closeMainWindow({ popToRootType: PopToRootType.Immediate });
    } catch (createError) {
      await showFailureToast(createError, { title: "Could Not Create Session" });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      navigationTitle="New Session"
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Session" icon={Icon.Plus} onSubmit={handleSubmit} />
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
        text="Creates the session, opens it in Rex, and starts a shell window."
      />
    </Form>
  );
}
