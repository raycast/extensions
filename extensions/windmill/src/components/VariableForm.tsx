import { ActionPanel, Action, Form, useNavigation, showToast, Toast, Icon, Keyboard } from "@raycast/api";
import { useFetchWmill } from "../hooks/useFetchWmill";
import { WorkspaceConfig, EditVariable, VariableListItemExtended } from "../types";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { FormValidation, useForm } from "@raycast/utils";

export function VariableForm({
  item,
  workspace,
  refreshItems,
}: {
  item?: VariableListItemExtended;
  workspace: WorkspaceConfig;
  refreshItems: (force_workspaces?: WorkspaceConfig[]) => void;
}) {
  const { data, error, isLoading, revalidate } = useFetchVariableValue(item?.path, workspace);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const { pop } = useNavigation();

  useEffect(() => {
    if (error) {
      showToast(Toast.Style.Failure, "Failed to load variable value", error.message);
    }
  }, [error]);

  if (isLoading) {
    return (
      <VariableFormWithData
        key="loading"
        error={error}
        isLoading={true}
        value=""
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
    <VariableFormWithData
      key="loaded"
      error={error}
      isLoading={false}
      value={typeof data === "string" ? data : ""}
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

function VariableFormWithData({
  value,
  submitting,
  setSubmitting,
  refreshItems,
  workspace,
  item,
  pop,
  revalidate,
  isLoading,
  error,
}: {
  value: string;
  submitting: boolean;
  setSubmitting: (submitting: boolean) => void;
  refreshItems: (force_workspaces?: WorkspaceConfig[]) => void;
  workspace: WorkspaceConfig;
  item?: VariableListItemExtended;
  pop: () => void;
  revalidate: () => void;
  isLoading: boolean;
  error?: Error | null;
}) {
  const { handleSubmit, itemProps } = useForm<EditVariable>({
    async onSubmit(values) {
      try {
        setSubmitting(true);
        await saveVariable(values, workspace, item);
      } catch (error) {
        if (error instanceof Error) {
          showToast(Toast.Style.Failure, "Failed to save variable", error.message);
        }
      } finally {
        setSubmitting(false);
        refreshItems([workspace]);
        pop();
      }
    },
    initialValues: {
      path: item?.path || "",
      value: value,
      is_secret: item?.is_secret || false,
      description: item?.description || "",
    },
    validation: {
      path: FormValidation.Required,
      value: FormValidation.Required,
      is_secret: FormValidation.Required,
    },
  });
  const openURL = `${workspace.remoteURL}variables?workspace=${workspace.workspaceId}`;

  return (
    <Form
      isLoading={isLoading || submitting}
      // enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={error ? "Can't Save Variable" : "Save Variable"}
            icon={error ? Icon.XMarkCircle : Icon.ArrowRightCircle}
            onSubmit={error ? undefined : handleSubmit}
          />

          <Action.OpenInBrowser
            shortcut={Keyboard.Shortcut.Common.Open}
            title="Open Variables in Browser"
            url={openURL}
          />

          {item?.path && (
            <Action
              title="Refresh Value"
              onAction={async () => {
                await revalidate();
              }}
            />
          )}
        </ActionPanel>
      }
      navigationTitle={item?.path || "New Variable"}
    >
      {item?.path ? (
        <Form.TextField
          title="Path"
          id={itemProps.path.id}
          value={itemProps.path.value}
          onChange={() => {
            /* do nothing */
          }}
        />
      ) : (
        <Form.TextField title="Path" {...itemProps.path} />
      )}

      <Form.TextArea title="Value" autoFocus={true} {...itemProps.value} />
      <Form.TextField title="Description" {...itemProps.description} />
      <Form.Checkbox label="Secret" {...itemProps.is_secret} />
    </Form>
  );
}

export function useFetchVariableValue(path: string | undefined, workspace: WorkspaceConfig) {
  if (!path) {
    const data = "";
    const error = null;
    const isLoading = false;
    const revalidate = () => {
      // do nothing
    };

    return { data, error, isLoading, revalidate };
  }

  const url = `${workspace.remoteURL}api/w/${workspace.workspaceId}/variables/get_value/${path}`;
  const token = workspace.workspaceToken;

  return useFetchWmill<string>(url, token, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

async function saveVariable(values: EditVariable, workspace: WorkspaceConfig, item?: VariableListItemExtended | null) {
  let url;
  if (item) {
    url = `${workspace.remoteURL}api/w/${workspace.workspaceId}/variables/update/${item.path}`;
  } else {
    url = `${workspace.remoteURL}api/w/${workspace.workspaceId}/variables/create`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${workspace.workspaceToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: values.path,
      value: values.value,
      is_secret: values.is_secret,
      description: values.description,
    }),
  });

  if (!response.ok) {
    const errorMessage = await response.text();
    throw new Error(errorMessage);
  }

  return await response.text();
}
