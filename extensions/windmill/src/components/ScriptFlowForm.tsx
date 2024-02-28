import { ActionPanel, Action, Form, useNavigation, Detail, showToast, Toast, Icon } from "@raycast/api";
import { FormItemsComponent } from "./FormItemsComponent";
import { FormResult } from "./FormResult";
import { useFetchWmill } from "../hooks/useFetchWmill";
import { StarAction } from "./StarAction";
import { WorkspaceConfig, Resource, Kind, WindmillItem } from "../types";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { Properties } from "../types";

export function ScriptFlowForm({
  path,
  kind,
  starred,
  workspace,
}: {
  path: string;
  kind: Kind;
  starred: boolean;
  workspace: WorkspaceConfig;
}) {
  let path_prefix = "";
  if (kind == "script") path_prefix = "p/";
  const url = `${workspace.remoteURL}api/w/${workspace.workspaceId}/${kind}s/get/${path_prefix}${path}`;
  const { data, error: loadError, isLoading } = useFetchWmill<WindmillItem>(url, workspace.workspaceToken);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [resources, setResources] = useState<Resource[]>([]);

  // get schema.properties from data and build the form from that
  const properties = data?.schema?.properties;
  const required = data?.schema?.required;

  // console.log('data', data, error)
  // console.log('properties', properties)

  useEffect(() => {
    if (properties) {
      const formats = Object.keys(properties).reduce((acc: string[], key) => {
        const property = properties[key];
        if (property.type === "object" && property.format?.startsWith("resource-")) {
          acc.push(property.format.replace(/^resource-/, ""));
        }
        return acc;
      }, []);

      console.log(formats);

      const fetchResources = async function () {
        const resource_types = formats.join(",");
        const url = `${workspace.remoteURL}api/w/${workspace.workspaceId}/resources/list?resource_type=${resource_types}&per_page=100`;
        const response = (await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${workspace.workspaceToken}`,
          },
        }).then((r) => r.json())) as Resource[];
        console.log("response", response);
        setResources(response);
      };

      if (formats.length) {
        fetchResources();
      }
    }
  }, [properties]);

  // console.log("data", data, error)
  console.log("properties", properties);

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (loadError) {
    showToast(Toast.Style.Failure, "Failed to load data", loadError.message);
    return <Detail markdown="Failed to load data" />;
  }

  // TODO: change to form validation
  if (submitError) {
    showToast(Toast.Style.Failure, "Failed to submit form", submitError);
    return <Detail markdown="Failed to submit form" />;
  }

  if (!properties || Object.keys(properties).length === 0) {
    const markdown = kind === "script" ? "This script has no inputs." : "This flow has no inputs.";
    return (
      <Detail
        markdown={markdown}
        actions={
          <ScriptActionPanel
            kind={kind}
            path={path}
            setSubmitError={setSubmitError}
            setSubmitting={setSubmitting}
            starred={starred}
            properties={properties}
            resources={resources}
            workspace={workspace}
          />
        }
      />
    );
  }

  return (
    <Form
      isLoading={isLoading || submitting}
      // enableDrafts
      actions={
        <ScriptActionPanel
          kind={kind}
          path={path}
          setSubmitError={setSubmitError}
          setSubmitting={setSubmitting}
          starred={starred}
          properties={properties}
          resources={resources}
          workspace={workspace}
        />
      }
      navigationTitle={path}
    >
      <FormItemsComponent
        properties={properties}
        required={required}
        kind={kind}
        resources={resources}
        workspace={workspace}
      />
    </Form>
  );
}

function ScriptActionPanel({
  kind,
  path,
  setSubmitError,
  setSubmitting,
  starred,
  properties,
  resources,
  workspace,
}: {
  kind: Kind;
  path: string;
  setSubmitError: React.Dispatch<React.SetStateAction<string | null>>;
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  starred: boolean;
  properties: any;
  resources: Resource[];
  workspace: WorkspaceConfig;
}) {
  const { push } = useNavigation();
  const openURL = `${workspace.remoteURL}${kind}s/get/${path}`;
  const editURL = `${workspace.remoteURL}${kind}s/edit/${path}`;
  const pastRunsURL = `${workspace.remoteURL}runs/${path}`;

  return (
    <ActionPanel>
      <Action.SubmitForm
        title={kind === "script" ? "Submit Script" : "Submit Flow"}
        icon={Icon.ArrowRightCircle}
        onSubmit={async (values) => {
          console.log("Submitting", path, values);
          setSubmitting(true);
          SubmitForm(values, path, kind, properties, resources, workspace)
            .then((jobId) => {
              push(<FormResult path={path} jobId={jobId} workspace={workspace} />);
            })
            .catch((error) => {
              if (error instanceof Error) {
                console.error(error);
                setSubmitError(error.message);
              } else {
                console.error(error);
                setSubmitError("An unexpected error occurred.");
              }
            })
            .finally(() => setSubmitting(false));
        }}
      />

      <Action.OpenInBrowser title={kind === "script" ? "Open Script" : "Open Flow"} url={openURL} />
      <Action.OpenInBrowser title={kind === "script" ? "Edit Script" : "Edit Flow"} url={editURL} />
      <StarAction path={path} kind={kind} starred={starred} workspace={workspace} />
      <Action.OpenInBrowser title="Open Past Runs" url={pastRunsURL} />
    </ActionPanel>
  );
}

async function SubmitForm(
  values: any,
  path: string,
  kind: Kind,
  properties: any,
  resources: Resource[],
  workspace: WorkspaceConfig
) {
  const url = `${workspace.remoteURL}api/w/${workspace.workspaceId}/jobs/run/${kind === "flow" ? "f" : "p"}/${path}`;
  for (const key in values) {
    const property = properties[key];
    if (!property) continue;
    switch (property?.type) {
      case "object":
        if (property.format?.startsWith("resource-")) {
          const resourceValue = await getResourceValue(values[key], workspace);
          values[key] = resourceValue;
        } else {
          values[key] = JSON.parse(values[key]);
        }
        break;
      case "array":
        values[key] = JSON.parse(values[key]);
        break;
      case "string":
        if (property.contentEncoding == "base64") {
          // TODO: read file and encode as base64
          console.log(key, values[key]);
        }
        break;
    }
  }
  const jobId = await submitData(url, workspace.workspaceToken, values);
  return jobId;
}

async function getResourceValue(path: string, workspace: WorkspaceConfig) {
  const url = `${workspace.remoteURL}api/w/${workspace.workspaceId}/resources/get_value/${path}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${workspace.workspaceToken}`,
      "Content-Type": "application/json",
    },
  });
  const value = await response.json();
  console.log("resourceValue", path, value);
  return value;
}

// @TODO: I think this Properties is wrong here
async function submitData(url: string, token: string, values: Properties) {
  console.log("submitting", url, values);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(values),
  });
  return await response.text();
}
