import * as React from "react";
import * as Types from "@ui/types.js";
import * as LocalStorageKey from "@ui/localstorage";
import {
  createDeeplink,
  DeeplinkType,
  useForm,
  useLocalStorage,
} from "@raycast/utils";
import { Action, ActionPanel, Form, Icon, LaunchType } from "@raycast/api";
import { ZabbixParamsTriggerGet } from "@api/zabbix/types";

export interface formData {
  server: string;
  params: string;
}

export function CustomProblemForm(): React.JSX.Element {
  /* Config */
  const { value: config, isLoading: isLoadingConfig } = useLocalStorage<
    Types.LocalStorageZabbixServer[]
  >(LocalStorageKey.LocalStorageKeyZabbixServer);

  /*  Validation Function for Server */
  const ValidateServer = (value?: string): string | undefined => {
    if (!config) return "Initializing validator, please wait...";
    if (!value) return "Please enter a value.";
    if (!config.find((v) => v.uuid === value))
      return "Selected Server Not Found";
  };

  /*  Validation Function for Params */
  const ValidateParams = (value?: string): string | undefined => {
    if (!config) return "Initializing validator, please wait...";
    if (!value) return "Please enter a value.";
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const json: ZabbixParamsTriggerGet = JSON.parse(value);
    } catch (error) {
      return `Please enter a valid JSON. ${error instanceof Error ? error.message : String(error)}`;
    }
  };

  /* Form */
  const { itemProps } = useForm<formData>({
    onSubmit() {},
    validation: {
      server: ValidateServer,
      params: ValidateParams,
    },
  });

  const link = React.useMemo(() => {
    if (!itemProps.server.value || !itemProps.params.value) return;

    /* Parse Params */
    let params: ZabbixParamsTriggerGet;
    try {
      params = JSON.parse(itemProps.params.value!);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return;
    }

    return createDeeplink({
      type: DeeplinkType.Extension,
      command: "problems",
      launchType: LaunchType.UserInitiated,
      context: {
        serverUUID: itemProps.server.value,
        params: params,
      } as Types.LaunchContextProblems,
    });
  }, [itemProps.server.value, itemProps.params.value]);

  const action = React.useMemo(() => {
    if (isLoadingConfig || !link) return false;
    return (
      <ActionPanel>
        <Action.CreateQuicklink
          quicklink={{ link: link }}
          title="Create Quicklink"
          icon={Icon.Plus}
        />
      </ActionPanel>
    );
  }, [isLoadingConfig, link]);

  return (
    <Form
      actions={action}
      isLoading={isLoadingConfig}
      searchBarAccessory={
        <Form.LinkAccessory
          text='Zabbix API "trigger.get" Docs'
          target="https://www.zabbix.com/documentation/current/en/manual/api/reference/trigger/get"
        />
      }
    >
      {config && (
        <Form.Dropdown title="Server" autoFocus={true} {...itemProps.server}>
          {config.map((v) => (
            <Form.Dropdown.Item title={v.name} value={v.uuid} key={v.uuid} />
          ))}
        </Form.Dropdown>
      )}
      {!isLoadingConfig && (
        <Form.TextArea title="Params" {...itemProps.params} />
      )}
      <Form.Description text='The JSON object passed to the "trigger.get" method. See the Zabbix documentation for more details.' />
    </Form>
  );
}
