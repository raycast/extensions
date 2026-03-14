import { Action, ActionPanel, Detail, Form, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { getServerDetail } from "../../api/smithery";
import { buildMcpInstallArgs } from "../../constants/commands";
import { MCP_CLIENTS } from "../../constants/mcp-clients";
import { runSmitheryMutation } from "../../utils/smithery";
import {
  showFailureToast,
  showRunningToast,
  showSuccessToast,
} from "../../utils/toast";

type McpInstallFormProps = {
  qualifiedName: string;
  displayName: string;
};

type ConfigField = {
  name: string;
  description?: string;
};

/**
 * Returns the required config fields for a server by inspecting its connections.
 *
 * Known limitation: only the first connection that declares required fields is
 * used. Servers with multiple connection types (e.g. both stdio and sse) will
 * only surface config fields for whichever connection appears first in the list.
 * A future improvement would be to add a connection-type selector to the form
 * and show the matching fields for the selected type.
 */
function extractConfigFields(
  config: Awaited<ReturnType<typeof getServerDetail>>,
): ConfigField[] {
  for (const connection of config.connections) {
    const required = connection.configSchema?.required ?? [];
    if (!required.length) {
      continue;
    }

    const properties = connection.configSchema?.properties ?? {};
    return required.map((name): ConfigField => {
      const property = properties[name];
      const description =
        typeof property === "object" &&
        property !== null &&
        "description" in property &&
        typeof property.description === "string"
          ? property.description
          : undefined;

      return { name, description };
    });
  }

  return [];
}

export function McpInstallForm({
  qualifiedName,
  displayName,
}: McpInstallFormProps) {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    getServerDetail,
    [qualifiedName],
    {
      keepPreviousData: true,
    },
  );

  const configFields = useMemo(
    () => (data ? extractConfigFields(data) : []),
    [data],
  );

  const [client, setClient] = useState<string>(
    MCP_CLIENTS[0]?.value ?? "claude-code",
  );
  const [configValues, setConfigValues] = useState<Record<string, string>>({});

  async function handleInstall() {
    const toast = await showRunningToast(
      `Installing ${displayName}`,
      `Adding to ${client}...`,
    );

    try {
      const args = buildMcpInstallArgs(qualifiedName, client);

      // Only pass --config if the user filled in at least one value.
      // Config fields are optional at install time; the server will prompt
      // or fail at runtime if a required value is missing.
      const filledConfig = configFields.reduce<Record<string, string>>(
        (acc, field) => {
          const value = configValues[field.name]?.trim();
          if (value) acc[field.name] = value;
          return acc;
        },
        {},
      );
      if (Object.keys(filledConfig).length > 0) {
        args.push("--config", JSON.stringify(filledConfig));
      }

      await runSmitheryMutation(args);
      showSuccessToast(
        toast,
        `Installed ${displayName}`,
        `Added to ${client}.`,
      );
    } catch (installError) {
      showFailureToast(
        toast,
        "Installation failed",
        installError,
        "Could not install MCP server.",
      );
    }
  }

  if (error && !data) {
    return (
      <Detail
        markdown={`# Failed to load server details\n\n${error.message}`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              onAction={revalidate}
              icon={Icon.RotateClockwise}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      navigationTitle={`Add ${displayName}`}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Install Server" onSubmit={handleInstall} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="client"
        title="Client"
        value={client}
        onChange={setClient}
      >
        {MCP_CLIENTS.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.title}
          />
        ))}
      </Form.Dropdown>

      {configFields.map((field) => (
        <Form.TextField
          key={field.name}
          id={field.name}
          title={field.name}
          placeholder="Optional — can be configured later"
          info={field.description}
          value={configValues[field.name] ?? ""}
          onChange={(value) =>
            setConfigValues((previous) => ({
              ...previous,
              [field.name]: value,
            }))
          }
        />
      ))}
    </Form>
  );
}
