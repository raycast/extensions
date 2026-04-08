import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useForm, FormValidation, usePromise } from "@raycast/utils";
import * as React from "react";
import { Server } from "./types";
import { vCenter } from "./vCenter";
import { ErrorApiGetToken } from "./errors";
import { AddServerConfig, GetConfig } from "./function";

interface props {
  SetShowView: React.Dispatch<React.SetStateAction<boolean>>;
  ServerSelected?: string;
  RevalidateServerNames?: () => void;
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

  const { data: Config, isLoading: IsLoadingConfig } = usePromise(GetConfig);
  const [IsLoadingForm, SetIsLoadingForm] = React.useState<boolean>(false);

  const { handleSubmit, itemProps, setValue } = useForm<FormData>({
    onSubmit(values) {
      Save(values);
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
    if (!props.ServerSelected) {
      if (!value || value.length < 1) return "The item is required";
      if (value.toLowerCase() === "all") {
        return "This name can't be used";
      }
      if (value.indexOf("_") > -1) {
        return "Character '_' can't be used";
      }
      if (Config && Config.filter((c) => c.name === value).length > 0) {
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
    SetIsLoadingForm(true);
    const name = props.ServerSelected ? props.ServerSelected : value.name;
    if (name && value.server && value.username && value.password) {
      /* Verify Provided Server Configuration */
      const vcenter = new vCenter(value.server, value.username, value.password);
      const vm = await vcenter.ListVM().catch(async (error: ErrorApiGetToken) => {
        await showToast({ title: "vCenter Error:", message: error.message, style: Toast.Style.Failure });
      });
      if (!vm) {
        SetIsLoadingForm(false);
        return false;
      }

      const config: Server = {
        name: name,
        server: value.server,
        username: value.username,
        password: value.password,
      };
      try {
        await AddServerConfig(config);
      } catch (error) {
        if (error instanceof Error)
          await showToast({ style: Toast.Style.Failure, title: "Error on Save", message: error.message });
        console.error(error);
        SetIsLoadingForm(false);
        return false;
      }
    } else {
      await showToast({ title: "Compile all Filed First", style: Toast.Style.Failure });
      SetIsLoadingForm(false);
      return false;
    }
    props.SetShowView(false);
    if (props.RevalidateServerNames) props.RevalidateServerNames();
    SetIsLoadingForm(false);
  }

  const ActionView = (
    <ActionPanel>
      <Action.SubmitForm onSubmit={handleSubmit} />
      {Config && Config.length > 0 ? (
        <Action title="Close" icon={Icon.Xmark} onAction={() => props.SetShowView(false)} />
      ) : null}
    </ActionPanel>
  );

  React.useEffect(() => {
    if (!IsLoadingConfig && Config && props.ServerSelected) {
      const data = Config.find((value) => value.name === props.ServerSelected);
      if (data) {
        setValue("name", data.name);
        setValue("server", data.server);
        setValue("username", data.username);
        setValue("password", data.password);
      }
    }
  }, [Config, IsLoadingConfig]);

  return (
    <Form actions={ActionView} isLoading={IsLoadingConfig || IsLoadingForm}>
      {!props.ServerSelected && (
        <Form.TextField title="Name" placeholder="Enter server name" info={NameInfo} {...itemProps.name} />
      )}
      <Form.TextField title="Server" placeholder="fqdn or ip" info={ServerInfo} {...itemProps.server} />
      <Form.TextField title="Username" placeholder="username" info={UsernameInfo} {...itemProps.username} />
      <Form.PasswordField title="Password" info={PasswordInfo} {...itemProps.password} />
    </Form>
  );
}
