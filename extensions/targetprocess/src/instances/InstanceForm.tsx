import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";

import { connect } from "../api/connect";
import { describeFailure } from "../api/failures";
import { Instance } from "../api/types";
import { validateDraft } from "./records";
import { newInstance, saveInstance, setSelectedInstanceId } from "./storage";

interface Props {
  instance?: Instance;
  onSaved: () => void;
}

export function InstanceForm({ instance, onSaved }: Props) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { label: string; url: string; token: string }) {
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Connecting…" });

    try {
      const fields = validateDraft(values);
      const candidate: Instance = instance ? { ...instance, ...fields } : newInstance(fields);

      const facts = await connect(candidate);
      const connected: Instance = {
        ...candidate,
        authTransport: facts.transport,
        userId: facts.userId,
        userName: facts.userName,
        apiV2Available: facts.apiV2Available,
        lastError: undefined,
      };

      const instances = await saveInstance(connected);
      if (instances.length === 1) await setSelectedInstanceId(connected.id);

      toast.style = Toast.Style.Success;
      toast.title = instance ? "Instance Updated" : "Instance Added";
      toast.message = `Connected as ${facts.userName}`;

      onSaved();
      pop();
    } catch (error) {
      const { title, message } = describeFailure(error, values.label.trim() || undefined);
      toast.style = Toast.Style.Failure;
      toast.title = title;
      toast.message = message;
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={instance ? "Save Instance" : "Add Instance"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="label"
        title="Name"
        placeholder="Acme Production"
        defaultValue={instance?.label}
        info="What to call this instance in the picker. Left blank, it is named after the host."
      />
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://acme.tpondemand.com"
        defaultValue={instance?.baseUrl}
        info="The address you use in the browser. On-premise installs with a path, such as https://tools.example.com/TargetProcess, work too."
      />
      <Form.PasswordField
        id="token"
        title="Access Token"
        defaultValue={instance?.token}
        info="Targetprocess: your profile → Settings → Access Tokens. Stored in Raycast's encrypted local storage."
      />
    </Form>
  );
}
