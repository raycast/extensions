import { GetServerLocalStorage } from "./function";
import { Action, ActionPanel, Form, Icon, LocalStorage, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import * as React from "react";
import { Server } from "./types";
import { vCenter } from "./vCenter";
import { ErrorApiGetToken } from "./errors";

interface props {
  server?: string;
  SetShowView: React.Dispatch<React.SetStateAction<boolean>>;
}

interface FormData {
  name?: string;
  server?: string;
  username?: string;
  password?: string;
}

export default function ServerView(props: props): JSX.Element {
  const NameInfo = "Provide a Name for This Server";
  const ServerInfo = "vCenter Server FQDN or IP";
  const UsernameInfo = "vCenter Username";
  const PasswordInfo = "vCenter Password";

  const { data: Server, isLoading: IsLoadingServer } = usePromise(GetServerLocalStorage);

  const [NameError, SetNameError] = React.useState<string | undefined>();
  const [ServerError, SetServerError] = React.useState<string | undefined>();
  const [UsernameError, SetUsernameError] = React.useState<string | undefined>();
  const [PasswordError, SetPasswordError] = React.useState<string | undefined>();

  /**
   * Validate Name Field.
   * @param {any} event
   * @returns {void}
   */
  function ValidateName(event: any): void {
    const value: string = event.target.value;
    if (value && value.length > 0) {
      if (value.toLowerCase() === "all") {
        SetNameError("This Name Can't Be Used");
        return;
      }
      if (value.indexOf("_") > -1) {
        SetNameError("Character '_' can't be used");
        return;
      }
      if (!props.server && Server && Server.filter((c) => c.name === value).length > 0) {
        SetNameError("You Ave Already Used This Name");
        return;
      }
      DropNameError();
    } else {
      SetNameError("The Field Should't be Empty");
    }
  }

  /**
   * Drop Name Error.
   * @returns {void}
   */
  function DropNameError(): void {
    if (NameError && NameError.length > 0) {
      SetNameError(undefined);
    }
  }

  /**
   * Validate Server Field.
   * @param {any} event
   * @returns {void}
   */
  function ValidateServer(event: any): void {
    const value: string = event.target.value;
    if (value && value.length > 0) {
      if (value.search(/^http[s]{0,1}:\/\//i) !== -1) {
        SetServerError("Url Not Allowed");
        return;
      }
      if (value.search(/[/]+/i) !== -1) {
        SetServerError("Invalid Characters");
        return;
      }
      DropServerError();
    } else {
      SetServerError("The Field Should't be Empty");
    }
  }

  /**
   * Drop Server Error.
   * @returns {void}
   */
  function DropServerError(): void {
    if (ServerError && ServerError.length > 0) {
      SetServerError(undefined);
    }
  }

  /**
   * Validate Username Field.
   * @param {any} event
   * @returns {void}
   */
  function ValidateUsername(event: any): void {
    const value = event.target.value;
    if (value && value.length > 0) {
      DropUsernameError();
    } else {
      SetUsernameError("The Field Should't be Empty");
    }
  }

  /**
   * Drop Server Error.
   * @returns {void}
   */
  function DropUsernameError(): void {
    if (UsernameError && UsernameError.length > 0) {
      SetUsernameError(undefined);
    }
  }

  /**
   * Validate Password Field.
   * @param {any} event
   * @returns {void}
   */
  function ValidatePassword(event: any): void {
    const value = event.target.value;
    if (value && value.length > 0) {
      DropPasswordError();
    } else {
      SetPasswordError("The Field Should't be Empty");
    }
  }

  /**
   * Drop Password Error.
   * @returns {void}
   */
  function DropPasswordError(): void {
    if (PasswordError && PasswordError.length > 0) {
      SetPasswordError(undefined);
    }
  }

  /**
   * Save Server to LocalStorage.
   * @param {FormData} value.
   * @returns {Promise<void>}
   */
  async function Save(value: FormData): Promise<void> {
    if ((value.name || props.server) && value.server && value.username && value.password) {
      // Verify Provided Server Configuration.
      const vcenter = new vCenter(value.server, value.username, value.password);
      const vm = await vcenter.ListVM().catch(async (error: ErrorApiGetToken) => {
        await showToast({ title: "vCenter Error:", message: error.message, style: Toast.Style.Failure });
      });
      if (!vm) return;

      if (Server) {
        if (!props.server) {
          Server.push(value as Server);
          await LocalStorage.setItem("server", JSON.stringify(Server));
        }
      } else {
        const server: Server[] = [];
        server.push(value as Server);
        await LocalStorage.setItem("server", JSON.stringify(server));
      }
      if (props.server) await LocalStorage.setItem("server_selected", props.server);
      if (value.name) await LocalStorage.setItem("server_selected", value.name);
      props.SetShowView(false);
    } else {
      await showToast({ title: "Compile all Filed First", style: Toast.Style.Failure });
    }
  }

  const ActionView = (
    <ActionPanel>
      {NameError || ServerError || UsernameError || PasswordError || IsLoadingServer ? null : (
        <Action.SubmitForm onSubmit={Save} />
      )}
      {Server ? <Action title="Close" icon={Icon.Xmark} onAction={() => props.SetShowView(false)} /> : null}
    </ActionPanel>
  );

  return (
    <Form isLoading={IsLoadingServer} actions={ActionView}>
      {!props.server ? (
        <Form.TextField
          id="name"
          title="Name"
          placeholder="server name"
          info={NameInfo}
          error={NameError}
          onChange={DropNameError}
          onBlur={ValidateName}
        />
      ) : null}
      {!props.server || (props.server && Server) ? (
        <Form.TextField
          id="server"
          title="Server"
          placeholder="fqdn or ip"
          info={ServerInfo}
          error={ServerError}
          onChange={DropServerError}
          onBlur={ValidateServer}
          defaultValue={
            props.server && Server
              ? Server.filter((c) => {
                  return c.name === props.server;
                })[0].server
              : undefined
          }
        />
      ) : null}
      {!props.server || (props.server && Server) ? (
        <Form.TextField
          id="username"
          title="Username"
          placeholder="username"
          info={UsernameInfo}
          error={UsernameError}
          onChange={DropUsernameError}
          onBlur={ValidateUsername}
          defaultValue={
            props.server && Server
              ? Server.filter((c) => {
                  return c.name === props.server;
                })[0].username
              : undefined
          }
        />
      ) : null}
      {!props.server || (props.server && Server) ? (
        <Form.PasswordField
          id="password"
          title="Password"
          info={PasswordInfo}
          error={PasswordError}
          onChange={DropPasswordError}
          onBlur={ValidatePassword}
          defaultValue={
            props.server && Server
              ? Server.filter((c) => {
                  return c.name === props.server;
                })[0].password
              : undefined
          }
        />
      ) : null}
    </Form>
  );
}
