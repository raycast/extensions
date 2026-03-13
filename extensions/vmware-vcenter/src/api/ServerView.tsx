import { Action, ActionPanel, Form, Icon, LocalStorage, Toast, showToast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import * as React from "react";
import { Server } from "./types";
import { vCenter } from "./vCenter";
import { ErrorApiGetToken } from "./errors";

interface props {
  SetShowView: React.Dispatch<React.SetStateAction<boolean>>;
  Server?: Server[];
  ServerSelected?: string;
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

  const ServerSelected: Server | undefined =
    props.ServerSelected && props.Server ? props.Server.filter((s) => s.name === props.ServerSelected)[0] : undefined;

  const { handleSubmit, itemProps } = useForm<FormData>({
    onSubmit(values) {
      Save(values);
    },
    initialValues: {
      name: ServerSelected ? ServerSelected.name : undefined,
      server: ServerSelected ? ServerSelected.server : undefined,
      username: ServerSelected ? ServerSelected.username : undefined,
      password: ServerSelected ? ServerSelected.password : undefined,
    },
    validation: {
      name: (value) => ValidateName(value),
      server: (value) => ValidateServer(value),
      username: FormValidation.Required,
      password: FormValidation.Required,
    },
  });

  /**
   * Validate Name Field.
   * @param {string | undefined} value
   * @returns {string | undefined | null}
   */
  function ValidateName(value: string | undefined): string | undefined | null {
    if (!ServerSelected) {
      if (!value || value.length < 1) return "The item is required";
      if (value.toLowerCase() === "all") {
        return "This name can't be used";
      }
      if (value.indexOf("_") > -1) {
        return "Character '_' can't be used";
      }
      if (props.Server && props.Server.filter((c) => c.name === value).length > 0) {
        return "You have already used this name";
      }
    }
  }

  /**
   * Validate Server Field.
   * @param {string | undefined} value
   * @returns {string | undefined | null}
   */
  function ValidateServer(value: string | undefined): string | undefined | null {
    if (!value || value.length < 1) return "The item is required";
    if (value.search(/^http[s]{0,1}:\/\//i) !== -1) {
      return "Url not allowed";
    }
    if (value.search(/[/]+/i) !== -1) {
      return "Invalid characters";
    }
  }

  /**
   * Save Server to LocalStorage.
   * @param {FormData} value.
   * @returns {Promise<void>}
   */
  async function Save(value: FormData): Promise<void | boolean> {
    if ((value.name || ServerSelected) && value.server && value.username && value.password) {
      // Verify Provided Server Configuration.
      const vcenter = new vCenter(value.server, value.username, value.password);
      const vm = await vcenter.ListVM().catch(async (error: ErrorApiGetToken) => {
        await showToast({ title: "vCenter Error:", message: error.message, style: Toast.Style.Failure });
      });
      if (!vm) return false;

      let changed = false;
      if (props.Server) {
        if (ServerSelected) {
          const i = props.Server.findIndex((s) => s.name === ServerSelected.name);
          if (i > -1) {
            props.Server[i] = {
              ...(value as Server),
              name: props.Server[i].name,
            };
            changed = true;
          } else {
            await showToast({
              title: "Can't find configuration for this server on LocalStorage",
              style: Toast.Style.Failure,
            });
          }
        } else {
          props.Server.push(value as Server);
          changed = true;
        }
        if (changed) LocalStorage.setItem("server", JSON.stringify(props.Server));
      } else {
        const server: Server[] = [];
        server.push(value as Server);
        await LocalStorage.setItem("server", JSON.stringify(server));
      }
      if (changed && value.name) await LocalStorage.setItem("server_selected", value.name);
      props.SetShowView(false);
    } else {
      await showToast({ title: "Compile all Filed First", style: Toast.Style.Failure });
    }
  }

  const ActionView = (
    <ActionPanel>
      <Action.SubmitForm onSubmit={handleSubmit} />
      {props.Server && props.Server.length > 0 ? (
        <Action title="Close" icon={Icon.Xmark} onAction={() => props.SetShowView(false)} />
      ) : null}
    </ActionPanel>
  );

  return (
    <Form actions={ActionView}>
      {!ServerSelected && (
        <Form.TextField title="Name" placeholder="Enter server name" info={NameInfo} {...itemProps.name} />
      )}
      <Form.TextField title="Server" placeholder="fqdn or ip" info={ServerInfo} {...itemProps.server} />
      <Form.TextField title="Username" placeholder="username" info={UsernameInfo} {...itemProps.username} />
      <Form.PasswordField title="Password" info={PasswordInfo} {...itemProps.password} />
    </Form>
  );
}
