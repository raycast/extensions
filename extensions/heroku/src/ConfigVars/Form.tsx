import React from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import heroku from "../heroku";
import { mutate } from "swr";

export function EditConfigVarsForm({
  env,
  configVars,
  appName,
  appId,
}: {
  env: string;
  configVars: Record<string, string>;
  appName: string;
  appId: string;
}) {
  const [value, setValue] = React.useState(configVars[env]);
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={`Edit ${appName} -> Environment Variables`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Update Variable"
            icon={Icon.Pencil}
            onSubmit={async () => {
              try {
                await heroku.requests.updateAppConfigVars({
                  params: { appId },
                  body: { [env]: value },
                });
                mutate(["config-vars", appId]);

                pop();
              } catch (e) {
                showToast(Toast.Style.Failure, "Failed to update variable");
              }
            }}
          />
          <Action.SubmitForm
            title="Delete Variable"
            icon={Icon.Trash}
            onSubmit={async () => {
              try {
                await heroku.requests.updateAppConfigVars({
                  params: { appId },
                  body: { [env]: null },
                });
                mutate(["config-vars", appId]);

                pop();
              } catch (e) {
                showToast(Toast.Style.Failure, "Failed to delete variable");
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="env_conf"
        title="Environment Variable"
        defaultValue={env}
        onChange={(curEnv) => {
          setValue(configVars[curEnv]);
        }}
      >
        {Object.keys(configVars).map((envName) => (
          <Form.Dropdown.Item title={envName} key={envName} value={envName} />
        ))}
      </Form.Dropdown>

      <Form.TextArea id="env_value" title="Edit Value" value={value} onChange={(v) => setValue(v)} />
    </Form>
  );
}

export function NewConfigVarsForm({ appId }: { appId: string }) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="New Environment Variable"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={async (values) => {
              try {
                await heroku.requests.updateAppConfigVars({
                  params: { appId },
                  body: { [values.env_name]: values.env_value },
                });
                mutate(["config-vars", appId]);

                pop();
              } catch (e) {
                showToast(Toast.Style.Failure, "Failed to create variable");
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="env_name" title="Environment Variable" />
      <Form.TextArea id="env_value" title="Environment Value" />
    </Form>
  );
}
