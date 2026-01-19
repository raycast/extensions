import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  popToRoot,
} from "@raycast/api";
import { useState } from "react";
import { runGCloudCommand } from "./utils";

export default function Command() {
  const [nameError, setNameError] = useState<string | undefined>();

  async function handleSubmit(values: {
    name: string;
    project: string;
    account: string;
    region: string;
  }) {
    if (!values.name) {
      setNameError("Configuration name is required");
      return;
    }

    try {
      // Create the configuration
      runGCloudCommand(`gcloud config configurations create ${values.name}`);

      // Set project if provided
      if (values.project) {
        runGCloudCommand(
          `gcloud config set project ${values.project} --configuration=${values.name}`,
        );
      }

      // Set account if provided
      if (values.account) {
        runGCloudCommand(
          `gcloud config set account ${values.account} --configuration=${values.name}`,
        );
      }

      // Set region if provided
      if (values.region) {
        runGCloudCommand(
          `gcloud config set compute/region ${values.region} --configuration=${values.name}`,
        );
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Configuration created",
        message: `Created configuration: ${values.name}`,
      });

      popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create configuration",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Configuration"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Configuration Name"
        placeholder="my-config"
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("Configuration name is required");
          } else {
            dropNameErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="project"
        title="Project ID"
        placeholder="my-gcp-project"
      />
      <Form.TextField
        id="account"
        title="Account Email"
        placeholder="user@example.com"
      />
      <Form.TextField
        id="region"
        title="Region"
        placeholder="us-central1"
        defaultValue="us-central1"
      />
    </Form>
  );
}
