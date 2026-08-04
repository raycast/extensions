import * as React from "react";
import type * as Types from "@ui/types.ts";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { ZabbixClient } from "@api/zabbix/main.js";
import { randomUUID } from "crypto";

interface props {
  ZabbixServer?: Types.LocalStorageZabbixServer[];
  SetZabbixServer: (value: Types.LocalStorageZabbixServer[]) => Promise<void>;
  selectedServer?: string;
  setSelectedServer: (value: string) => Promise<void>;
}

export function ServerForm(props: props): React.JSX.Element {
  /* Raycast */
  const { pop } = useNavigation();

  /* UI */
  const [IsLoading, SetIsLoading] = React.useState<boolean>(false);

  /* Validation Function for Name */
  const ValidateName = (value?: string): string | undefined => {
    /* Name must be defined */
    if (!value) return "Please enter a value.";

    /* Name 'All' can't be used */
    if (value.toUpperCase() === "ALL") return "This name can't be used";

    /* Ignore Server Name if editing */
    if (props.selectedServer) return;

    /* Error: Server Name already used*/
    if (
      props.ZabbixServer &&
      props.ZabbixServer.findIndex((v) => v.name === value) > -1
    )
      return "A server with this name already exists.";
  };

  /* Validation Function for Url */
  const ValidateUrl = (value?: string): string | undefined => {
    /* Name must be defined */
    if (!value) return "Please enter a value.";

    /* Must Start with 'http://' (👀) or 'https://' */
    if (!value.startsWith("http://") && !value.startsWith("https://"))
      return "URL must start with http:// or https://";

    /* Must End with '/api_jsonrpc.php' */
    if (!value.endsWith("/api_jsonrpc.php"))
      return "URL must end with /api_jsonrpc.php";

    /* Must be a valid URL */
    try {
      new URL(value);
    } catch {
      return "Please enter a valid URL.";
    }
  };

  /* Form */
  const { handleSubmit, itemProps } = useForm<Types.LocalStorageZabbixServer>({
    async onSubmit(values) {
      /* Set Loading */
      SetIsLoading(true);

      /* Set UUID */
      values.uuid =
        props.ZabbixServer?.find((v) => v.uuid === props.selectedServer)
          ?.uuid ?? randomUUID();

      /* Get Zabbix Server Version for test connection */
      const client = new ZabbixClient({ url: values.url, key: values.key });
      try {
        const version = await client.MethodApiInfoVersion();

        /* Zabbix Server but be 7.0.0 or above */
        if (Number(version.result.split(".")[0]) < 7)
          throw new Error(`Zabbix Server ${version.result} is not supported.`);
      } catch (error) {
        console.warn(error);

        /* Show Error */
        const msg = error instanceof Error ? error.message : String(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Connection Error",
          message: msg,
        });

        /* Set Loading */
        SetIsLoading(false);

        return;
      }

      /* If ZabbixServer is undefined save as new config */
      if (!props.ZabbixServer) {
        await props.SetZabbixServer([values]);

        /* Set Loading */
        SetIsLoading(false);

        pop();
        return;
      }

      /* Deep Copy */
      const config = structuredClone(props.ZabbixServer);

      /* Remove Old Config if editing */
      if (props.selectedServer) {
        const index = config.findIndex((v) => v.uuid === props.selectedServer);
        if (index > -1) config.splice(index, 1);
      }

      /* Push New Config */
      config.push(values);

      /* Order Array */
      config.sort((a, b) => {
        const nameA = a.name.toUpperCase();
        const nameB = b.name.toUpperCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      });

      /* Save */
      await props.SetZabbixServer(config);

      /* Set Loading */
      SetIsLoading(false);

      /* Change Selected Server */
      if (!props.selectedServer) await props.setSelectedServer(values.uuid);

      pop();
    },
    validation: {
      name: ValidateName,
      url: ValidateUrl,
      key: FormValidation.Required,
    },
    initialValues: {
      name:
        props.selectedServer &&
        props.ZabbixServer?.find((v) => v.uuid === props.selectedServer)
          ? props.ZabbixServer?.find((v) => v.uuid === props.selectedServer)
              ?.name
          : "",
      url:
        props.selectedServer &&
        props.ZabbixServer?.find((v) => v.uuid === props.selectedServer)
          ? props.ZabbixServer?.find((v) => v.uuid === props.selectedServer)
              ?.url
          : "",
      key:
        props.selectedServer &&
        props.ZabbixServer?.find((v) => v.uuid === props.selectedServer)
          ? props.ZabbixServer?.find((v) => v.uuid === props.selectedServer)
              ?.key
          : "",
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          {!IsLoading && (
            <Action.SubmitForm
              title="Save"
              icon={Icon.Plus}
              onSubmit={handleSubmit}
            />
          )}
        </ActionPanel>
      }
      isLoading={IsLoading}
    >
      <Form.TextField title="Name" autoFocus={true} {...itemProps.name} />
      <Form.TextField
        title="URL"
        placeholder="https://zabbix.local/zabbix/api_jsonrpc.php"
        {...itemProps.url}
      />
      <Form.PasswordField title="API Key" {...itemProps.key} />
    </Form>
  );
}
