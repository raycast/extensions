import * as React from "react";
import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { OllamaServer } from "../../../ollama/types";
import { AddOllamaServers, DeleteOllamaServers, EditOllamaServers } from "../../../settings/settings";
import { OllamaServerAuthorizationMethod } from "../../../ollama/enum";

interface props {
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
  revalidate: CallableFunction;
  servers: string[];
  name?: string;
  server?: OllamaServer;
}

interface FormData {
  name: string;
  url: string;
  auth: string;
  username?: string;
  password?: string;
  token?: string;
}

export function FormEditServer(props: props): JSX.Element {
  const { handleSubmit, itemProps } = useForm<FormData>({
    onSubmit(values) {
      Submit(values);
    },
    initialValues: {
      name: props.name ? props.name : "",
      url: props.server ? props.server.url : "http://127.0.0.1:11434",
      auth: props.server && props.server.auth ? props.server.auth.mode : "None",
      username:
        props.server && props.server.auth && props.server.auth.mode === OllamaServerAuthorizationMethod.BASIC
          ? props.server.auth.username
          : undefined,
      password:
        props.server && props.server.auth && props.server.auth.mode === OllamaServerAuthorizationMethod.BASIC
          ? props.server.auth.password
          : undefined,
      token:
        props.server && props.server.auth && props.server.auth.mode === OllamaServerAuthorizationMethod.BEARER
          ? props.server.auth.token
          : undefined,
    },
    validation: {
      name: ValidateName,
      url: ValidateUrl,
      auth: FormValidation.Required,
      username: ValidateAuthenticationBasic,
      password: ValidateAuthenticationBasic,
      token: ValidateAuthenticationBearer,
    },
  });

  function ValidateName(value: string | undefined): string | undefined | null {
    if (!value) return "The item is required";
    if (value === "All" || value === "Local") return "Name already in use";
    if (!props.name && props.servers.find((v) => v === value)) return "Name already in use";
  }

  function ValidateUrl(value: string | undefined): string | undefined | null {
    if (!value) return "The item is required";
    if (value.substring(value.length - 1, value.length) === "/") return `The item shouldn't end with a "/" character.`;
    if (!value.match(/http(s)?:\/\/[a-z\d.:/]+/gim)) return "The item must be a valid url";
  }

  function ValidateAuthenticationBasic(value: string | undefined): string | undefined | null {
    if (itemProps.auth.value === OllamaServerAuthorizationMethod.BASIC && !value) return "The item is required";
  }

  function ValidateAuthenticationBearer(value: string | undefined): string | undefined | null {
    if (itemProps.auth.value === OllamaServerAuthorizationMethod.BEARER && !value) return "The item is required";
  }

  async function Submit(values: FormData): Promise<void> {
    const s: OllamaServer = {
      url: values.url,
    };
    if (values.auth !== "None")
      s.auth = {
        mode: values.auth as OllamaServerAuthorizationMethod,
        username: values.username,
        password: values.password,
        token: values.token,
      };
    if (props.name) {
      if (props.name === values.name) {
        await EditOllamaServers(values.name, s);
      } else {
        await DeleteOllamaServers(props.name);
        await AddOllamaServers(values.name, s);
      }
    } else {
      await AddOllamaServers(values.name, s);
    }
    props.revalidate();
    props.setShow(false);
  }

  const InfoName = "Ollama Server Name";
  const InfoUrl = "Ollama Server Url";
  const InfoAuthentication = "Ollama Server Authentication Method";
  const InfoAuthenticationUsername = "Ollama SServer Authentication Username";
  const InfoAuthenticationPassword = "Ollama SServer Authentication Password";
  const InfoAuthenticationToken = "Ollama SServer Authentication Token";

  const ActionView = (
    <ActionPanel>
      <Action.SubmitForm onSubmit={handleSubmit} />
      <Action title="Close" icon={Icon.Xmark} onAction={() => props.setShow(false)} />
    </ActionPanel>
  );

  return (
    <Form actions={ActionView}>
      <Form.TextField title="Name" info={InfoName} {...itemProps.name} />
      <Form.TextField title="Model" info={InfoUrl} {...itemProps.url} />
      <Form.Dropdown title="Authentication" info={InfoAuthentication} {...itemProps.auth}>
        <Form.Dropdown.Item title="None" value="None" />
        <Form.Dropdown.Item
          title={OllamaServerAuthorizationMethod.BASIC}
          value={OllamaServerAuthorizationMethod.BASIC}
        />
        <Form.Dropdown.Item
          title={OllamaServerAuthorizationMethod.BEARER}
          value={OllamaServerAuthorizationMethod.BEARER}
        />
      </Form.Dropdown>
      {itemProps.auth.value && itemProps.auth.value === OllamaServerAuthorizationMethod.BASIC && (
        <Form.TextField title="Username" info={InfoAuthenticationUsername} {...itemProps.username} />
      )}
      {itemProps.auth.value && itemProps.auth.value === OllamaServerAuthorizationMethod.BASIC && (
        <Form.PasswordField title="Password" info={InfoAuthenticationPassword} {...itemProps.password} />
      )}
      {itemProps.auth.value && itemProps.auth.value === OllamaServerAuthorizationMethod.BEARER && (
        <Form.PasswordField title="Token" info={InfoAuthenticationToken} {...itemProps.token} />
      )}
    </Form>
  );
}
