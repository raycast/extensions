import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import * as React from "react";
import { McpServerConfig } from "../../types";
import { GetInitialValueConfig } from "./function";
import { ToolMcp } from "../../ChatView/tools/mcp";

interface props {
  setShow: (value: boolean) => void;
  config: McpServerConfig;
  setConfig: (value: McpServerConfig) => Promise<void>;
  configName?: string;
}

interface FormData {
  config: string;
}

export function McpServerFormConfig(props: props): React.JSX.Element {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { handleSubmit, itemProps } = useForm<FormData>({
    async onSubmit(values) {
      /* Set Loading */
      setIsLoading(true);

      /* Deep copy of the old config */
      const newConfig: McpServerConfig = structuredClone(props.config);
      if (props.configName) delete newConfig.mcpServers[props.configName];

      /* Save new mcp server config  */
      const configToSave: McpServerConfig = JSON.parse(values.config);
      for (const key of Object.keys(configToSave.mcpServers)) {
        /* Test Mcp Server */
        try {
          await ToolMcp(configToSave.mcpServers[key]);
        } catch (error) {
          console.error(error);
          if (error instanceof Error)
            await showToast({
              style: Toast.Style.Failure,
              title: `Error on Mcp Server "${key}"`,
              message: error.message,
            });
          /* Set Loading */
          setIsLoading(false);
          return;
        }
        newConfig.mcpServers[key] = configToSave.mcpServers[key];
      }
      await props.setConfig(newConfig);
      setIsLoading(false);
      props.setShow(false);
    },
    initialValues: {
      config: GetInitialValueConfig(props.config, props.configName),
    },
    validation: {
      config: ValidateConfig,
    },
  });

  /**
   * Validate JSON Mcp Config.
   * @param value - Mcp Server Config on string format.
   */
  function ValidateConfig(value: string | undefined): string | undefined | null {
    // Exception on undefined value.
    if (!value) return "Empty Config.";

    // Exception on invalid JSON Mcp Server Config.
    let config: McpServerConfig;
    try {
      config = JSON.parse(value);
    } catch (e) {
      return `Wrong Mcp Server Config JSON Format: ${e}.`;
    }

    // Exception if adding Mcp Server Config with already used name.
    if (!config.mcpServers) return "Missing 'mcpServers' key.";
    const currentNames = Object.keys(props.config.mcpServers);
    const newNames = Object.keys(config.mcpServers);
    const commonName = currentNames.find(
      (currentName) => newNames.findIndex((newName) => currentName === newName && newName !== props.configName) !== -1,
    );
    if (commonName) return `Mcp Server "${commonName}" already configured.`;
  }

  /**
   * Action Menu.
   */
  function ActionMain(): React.JSX.Element {
    return (
      <ActionPanel>
        <Action.SubmitForm onSubmit={handleSubmit} />
        <Action title="Undo" icon={Icon.Undo} onAction={() => props.setShow(false)} />
      </ActionPanel>
    );
  }

  return (
    <Form actions={<ActionMain />} isLoading={isLoading}>
      <Form.TextArea
        title="Mcp Server Config"
        info="Copy Mcp Server config in json format"
        autoFocus={true}
        {...itemProps.config}
      />
    </Form>
  );
}
