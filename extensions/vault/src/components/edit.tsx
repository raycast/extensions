import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback, useState } from "react";
import { callWrite, stringify } from "../utils";
import { VaultDisplay } from "./display";
import { Back, CopyToken, Root } from "./actions";

export function VaultEdit(props: { path: string; currentSecret: object }) {
  const { push, pop } = useNavigation();

  const [isLoading, setIsLoading] = useState(false);
  const [newSecret, setNewSecret] = useState<string>(stringify(props.currentSecret));
  const [newSecretError, setNewSecretError] = useState<string | undefined>();

  const saveSecret = useCallback(
    async (values: { newSecret: string }) => {
      setIsLoading(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Saving secret",
      });

      try {
        const newSecretData = JSON.parse(values.newSecret);

        if (
          await confirmAlert({
            title: "Do you want to create a new version ?",
            message: "This will create new active version for this path",
            primaryAction: {
              title: "Create",
              style: Alert.ActionStyle.Destructive,
            },
            icon: Icon.SaveDocument,
            dismissAction: {
              title: "Cancel",
              style: Alert.ActionStyle.Cancel,
            },
          })
        ) {
          const response = await callWrite(props.path, newSecretData);

          toast.style = Toast.Style.Success;
          toast.message = "Secret saved (version " + response.version + "), reloading";

          // redirect to read saved secret after 1 sec
          setTimeout(() => push(<VaultDisplay path={props.path} />), 1000);
        } else {
          await toast.hide();
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.message = "Failed to save secret\nPath: " + props.path + "\n" + String(error);
      } finally {
        setIsLoading(false);
      }
    },
    [props.path, push]
  );

  const onChangeNewSecret = useCallback((newValue: string) => {
    setNewSecret(newValue);
    try {
      JSON.parse(newValue);
      setNewSecretError(undefined);
    } catch (error) {
      setNewSecretError("Invalid json");
    }
  }, []);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save New Secret"
            onSubmit={saveSecret}
            icon={Icon.SaveDocument}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <Back path={props.path} />
          <Root />
          <CopyToken />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="newSecret"
        title="New secret"
        value={newSecret}
        error={newSecretError}
        onChange={onChangeNewSecret}
      />
    </Form>
  );
}
