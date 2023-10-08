import { ActionPanel, Action, Form, useNavigation, showToast, Toast, Icon, Keyboard } from "@raycast/api";
import { useFetchWmill } from "../hooks/useFetchWmill";
import { WorkspaceConfig, ResourceListItemExtended } from "../types";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { FormValidation, useForm } from "@raycast/utils";

export function ResourceForm({
  item,
  workspace,
  refreshItems,
}: {
  item?: ResourceListItemExtended;
  workspace: WorkspaceConfig;
  refreshItems: (force_workspaces?: WorkspaceConfig[]) => void;
}) {
  const { data, error, isLoading, revalidate } = useFetchResourceValue(item?.path, workspace);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const { pop } = useNavigation();

  useEffect(() => {
    if (error) {
      showToast(Toast.Style.Failure, "Failed to load resource value", error.message);
    }
  }, [error]);

  if (isLoading) {
    return (
      <ResourceFormWithData
        key="loading"
        isLoading={true}
        value="{}"
        submitting={submitting}
        setSubmitting={setSubmitting}
        refreshItems={refreshItems}
        workspace={workspace}
        item={item}
        pop={pop}
        revalidate={revalidate}
      />
    );
  }

  return (
    <ResourceFormWithData
      key="loaded"
      isLoading={false}
      value={JSON.stringify(data, null, 4)}
      submitting={submitting}
      setSubmitting={setSubmitting}
      refreshItems={refreshItems}
      workspace={workspace}
      item={item}
      pop={pop}
      revalidate={revalidate}
    />
  );
}

function ResourceFormWithData({
  value,
  submitting,
  setSubmitting,
  refreshItems,
  workspace,
  item,
  pop,
  revalidate,
  isLoading,
}: {
  value: string;
  submitting: boolean;
  setSubmitting: (submitting: boolean) => void;
  refreshItems: (force_workspaces?: WorkspaceConfig[]) => void;
  workspace: WorkspaceConfig;
  item?: ResourceListItemExtended;
  pop: () => void;
  revalidate: () => void;
  isLoading: boolean;
}) {
  const { handleSubmit, itemProps } = useForm<EditResource>({
    async onSubmit(values) {
      setSubmitting(true);
      await saveResource(values, workspace, item);
      setSubmitting(false);
      refreshItems([workspace]);
      pop();
    },
    initialValues: {
      path: item?.path ?? "",
      value: value,
      description: item?.description ?? "",
      resource_type: item?.resource_type ?? "",
    },
    validation: {
      path: FormValidation.Required,
      value: FormValidation.Required,
      resource_type: FormValidation.Required,
    },
  });
  const openURL = `${workspace.remoteURL}resources?workspace=${workspace.workspaceId}`;

  return (
    <Form
      isLoading={isLoading || submitting}
      // enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Resource" icon={Icon.ArrowRightCircle} onSubmit={handleSubmit} />

          {item?.path && (
            <Action
              title="Refresh Value"
              onAction={async () => {
                await revalidate();
              }}
            />
          )}

          <Action.OpenInBrowser
            shortcut={Keyboard.Shortcut.Common.Open}
            title="Open Resources in Browser"
            url={openURL}
          />
        </ActionPanel>
      }
      navigationTitle={item?.path || "New Resource"}
    >
      <Form.TextField
        title="Path"
        id={itemProps.path.id}
        value={itemProps.path.value}
        onChange={() => {
          /* do nothing */
        }}
      />
      <Form.TextArea title="Value" {...itemProps.value} />
      <Form.TextField title="Description" {...itemProps.description} />
      <Form.TextField title="Resource Type" {...itemProps.resource_type} />
    </Form>
  );
}

export function useFetchResourceValue(path: string | undefined, workspace: WorkspaceConfig) {
  if (!path) {
    const data = {};
    const error = null;
    const isLoading = false;
    const revalidate = () => {
      // do nothing
    };

    return { data, error, isLoading, revalidate };
  }

  const url = `${workspace.remoteURL}api/w/${workspace.workspaceId}/resources/get_value/${path}`;
  const token = workspace.workspaceToken;

  return useFetchWmill<string>(url, token, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

type EditResource = {
  path: string;
  value: string;
  resource_type: string;
  description: string;
};

async function saveResource(values: EditResource, workspace: WorkspaceConfig, item?: ResourceListItemExtended | null) {
  let url;
  if (item) {
    url = `${workspace.remoteURL}api/w/${workspace.workspaceId}/resources/update/${item.path}`;
  } else {
    url = `${workspace.remoteURL}api/w/${workspace.workspaceId}/resources/create`;
  }

  let value;
  try {
    value = JSON.parse(values.value);
  } catch (e) {
    value = values.value;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${workspace.workspaceToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: values.path,
      value: value,
      resource_type: values.resource_type,
      description: values.description,
    }),
  });
  return await response.text();
}
