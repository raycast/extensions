import * as React from "react";
import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { GlpiServer } from "@ui/types";
import { localStorage } from "@ui/localstorage";
import { clientGlpi } from "@services/glpi";

interface Props {
  glpiServer: GlpiServer;
}

interface FormData {
  /**
   * Username
   */
  username?: string;

  /**
   * Password
   */
  password?: string;
}

export default function AuthForm(props: Props): React.ReactElement {
  /* Raycast */
  const { pop } = useNavigation();

  /* UI */
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  /**
   * Submit form function.
   *
   * @param value - Form data.
   */
  const Submit = React.useCallback(
    async (value: FormData): Promise<void> => {
      if (isLoading) return;

      /* Error: `clientGlpi` undefined */
      if (!clientGlpi) {
        console.error("Component: <AuthForm/>. Function `Submit` called with undefined `clientGlpi`");
        return;
      }

      /* Set Loading */
      setIsLoading(true);

      /* Auth */
      try {
        await clientGlpi.getTokenWithPassword(value.username!, value.password!);
      } catch (e) {
        const error = e instanceof Error ? e : new Error("Unexpected Authentication Error", { cause: e });
        await showFailureToast(error);
        setIsLoading(false);
        return;
      }

      /* Save Selected Glpi server */
      try {
        await localStorage.setSelectedGlpiServer(props.glpiServer.uuid);
      } catch (e) {
        console.warn(`ReactElement: ServerForm. Unexpected LocalStorage Error.`, { e });
      }

      /* Set Loading */
      setIsLoading(false);

      pop();
    },
    [isLoading, props],
  );

  /* Form */
  const { handleSubmit, itemProps } = useForm<FormData>({
    onSubmit: Submit,
    validation: {
      username: FormValidation.Required,
      password: FormValidation.Required,
    },
  });

  /* <ActionPanel> */
  const actionPanel = React.useMemo(() => {
    if (isLoading) return <ActionPanel></ActionPanel>;
    return (
      <ActionPanel>
        <Action.SubmitForm title="Authenticate" icon={Icon.Fingerprint} onSubmit={handleSubmit} />
      </ActionPanel>
    );
  }, [isLoading, handleSubmit]);

  /* <Form.LinkAccessory/> */
  const linkAccessory = (
    <Form.LinkAccessory
      target="https://help.glpi-project.org/documentation/modules/configuration/oauth-clients"
      text="GLPI OAuth Client DOCS"
    />
  );

  return (
    <Form actions={actionPanel} searchBarAccessory={linkAccessory} isLoading={isLoading}>
      <Form.Description text={`Session Expired for '${props.glpiServer.name}'. Please reauthenticate.`} />
      <Form.TextField title="Username" {...itemProps.username} />
      <Form.PasswordField title="Password" {...itemProps.password} />
    </Form>
  );
}
