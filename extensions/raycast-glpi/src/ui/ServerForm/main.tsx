import * as React from "react";
import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { GlpiServer } from "@ui/types";
import { ValidateEndpoint, ValidateName } from "./function";
import { GlpiApiClient } from "@api/glpi/main";
import { randomUUID } from "crypto";
import { localStorage } from "@ui/localstorage";

interface Props {
  revalidate: () => Promise<GlpiServer[] | undefined>;
  glpiServer?: GlpiServer;
}

interface FormData {
  /**
   * Server name.
   */
  name: string;

  /**
   * OAuth2 Endpoint.
   */
  endpoint: string;

  /**
   * OAuth2 Client ID.
   */
  clientid: string;

  /**
   * OAuth2 Client Secret.
   */
  clientsecret: string;

  /**
   * Username
   */
  username?: string;

  /**
   * Password
   */
  password?: string;
}

export default function ServerForm(props: Props): React.ReactElement {
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

      /* Set Loading */
      setIsLoading(true);

      /* Check if OAuth2 setting are currect */
      try {
        if (
          props.glpiServer &&
          (value.endpoint !== props.glpiServer.endpoint ||
            value.clientid !== props.glpiServer.clientid ||
            value.clientsecret !== props.glpiServer.clientsecret)
        ) {
          const client = new GlpiApiClient(value.endpoint, value.clientid, value.clientsecret);
          await client.getTokenWithRefreshToken();
        } else if (!props.glpiServer) {
          const client = new GlpiApiClient(value.endpoint, value.clientid, value.clientsecret);
          await client.getTokenWithPassword(value.username!, value.password!);
        }
      } catch (e) {
        const error = e instanceof Error ? e : new Error("Unexpected Authentication Error", { cause: e });
        await showFailureToast(error);
        setIsLoading(false);
        return;
      }

      /* Save Glpi server config */
      const config: GlpiServer = {
        uuid: props.glpiServer?.uuid ? props.glpiServer.uuid : randomUUID(),
        name: value.name,
        endpoint: value.endpoint,
        clientid: value.clientid,
        clientsecret: value.clientsecret,
      };
      try {
        await localStorage.editGlpiServerConfig(config);
      } catch (e) {
        const error = e instanceof Error ? e : new Error("Unexpected LocalStorage Error", { cause: e });
        await showFailureToast(error);
        setIsLoading(false);
        return;
      }

      /* Save Selected Glpi server */
      try {
        await localStorage.setSelectedGlpiServer(config.uuid);
      } catch (e) {
        console.warn(`ReactElement: ServerForm. Unexpected LocalStorage Error.`, { e });
      }

      /* Set Loading */
      setIsLoading(false);

      await props.revalidate();
      pop();
    },
    [isLoading, props],
  );

  /* Form */
  const { handleSubmit, itemProps } = useForm<FormData>({
    onSubmit: Submit,
    initialValues: {
      name: props.glpiServer?.name,
      endpoint: props.glpiServer?.endpoint,
      clientid: props.glpiServer?.clientid,
      clientsecret: props.glpiServer?.clientsecret,
    },
    validation: {
      name: ValidateName,
      endpoint: ValidateEndpoint,
      clientid: FormValidation.Required,
      clientsecret: FormValidation.Required,
      username: props.glpiServer ? undefined : FormValidation.Required,
      password: props.glpiServer ? undefined : FormValidation.Required,
    },
  });

  /* <ActionPanel> */
  const actionPanel = React.useMemo(() => {
    if (isLoading) return <ActionPanel></ActionPanel>;
    return (
      <ActionPanel>
        <Action.SubmitForm title="Save" icon={Icon.Plug} onSubmit={handleSubmit} />
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
      <Form.Description text="GLPI OAuth2 Client Settings." />
      <Form.Description text="Client must have `Grants` set to `password` and `Scopes` to `api`" />
      <Form.TextField title="Name" autoFocus={true} {...itemProps.name} />
      <Form.TextField title="Endpoint" placeholder="https://glpi.example.com/" {...itemProps.endpoint} />
      <Form.TextField title="Client ID" {...itemProps.clientid} />
      <Form.PasswordField title="Client Secret" {...itemProps.clientsecret} />
      {!props.glpiServer && <Form.TextField title="Username" {...itemProps.username} />}
      {!props.glpiServer && <Form.PasswordField title="Password" {...itemProps.password} />}
    </Form>
  );
}
