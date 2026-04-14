import { ActionPanel, Action, Form, showToast, Toast, useNavigation, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { GCloudConfig } from "../types";
import { createConfiguration } from "../ConfigurationsService";
import { friendlyErrorMessage } from "../../../utils/errorMessages";

interface Props {
  gcloudPath: string;
  configs: GCloudConfig[];
  onCreated: () => void;
}

export function CreateConfigForm({ gcloudPath, configs, onCreated }: Props) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const defaultRegion = getPreferenceValues<Preferences>().defaultRegion || "us-central1";

  async function handleSubmit(values: { name: string; project: string; account: string; region: string }) {
    if (!values.name) {
      setNameError("Configuration name is required");
      return;
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(values.name)) {
      setNameError("Name must start with a letter and contain only letters, numbers, hyphens, underscores");
      return;
    }
    if (configs.some((c) => c.name === values.name)) {
      setNameError("A configuration with this name already exists");
      return;
    }
    try {
      await createConfiguration(gcloudPath, values.name, {
        project: values.project || undefined,
        account: values.account || undefined,
        region: values.region || undefined,
      });
      await showToast({ style: Toast.Style.Success, title: "Configuration created", message: values.name });
      onCreated();
      pop();
    } catch (error) {
      const friendly = friendlyErrorMessage(error, "Failed to create configuration");
      await showToast({ style: Toast.Style.Failure, title: friendly.title, message: friendly.message });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Configuration" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Configuration Name"
        placeholder="my-config"
        error={nameError}
        onChange={() => nameError && setNameError(undefined)}
        onBlur={(e) => {
          if (!e.target.value?.length) setNameError("Configuration name is required");
        }}
      />
      <Form.TextField id="project" title="Project ID" placeholder="my-gcp-project" />
      <Form.TextField id="account" title="Account Email" placeholder="user@example.com" />
      <Form.TextField id="region" title="Region" placeholder={defaultRegion} defaultValue={defaultRegion} />
    </Form>
  );
}
