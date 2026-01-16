import {
  Action,
  ActionPanel,
  Color,
  Form,
  getPreferenceValues,
  Icon,
  List,
  openCommandPreferences,
} from "@raycast/api";
import { JSONSchema7 } from "json-schema";
import numeral from "numeral";
import { useEffect, useMemo, useState } from "react";
import { ToggleDetailsAction } from "../../shared/actions";
import { useApplications } from "../../shared/application";
import { SUPPORTED_CLIENTS } from "../../shared/mcp";
import { InstallServerToClientAction } from "../builtin/actions";
import { RegistryProps } from "../types";
import { Connection, Server, useServerDetails, useServers } from "./api";

const preferences: Preferences.SearchServers = getPreferenceValues();

export function SmitheryRegistry(props: RegistryProps) {
  if (!preferences.smitheryApiKey) {
    return <MissingAPIKey />;
  }

  return <Registry {...props} />;
}

function MissingAPIKey() {
  const markdown = `
  # Missing API Key
  To use the Smithery MCP Registry, you need to add your personal API key to the command's preferences.

  ![Missing API Key](smithery-missing-api-key.png)
  
  You can learn how to create an API key in [Smithery's account settings](https://smithery.ai/account/api-keys).`;

  return (
    <List.Item
      key="missing-api-key"
      icon={Icon.Warning}
      title="Missing API Key"
      detail={<List.Item.Detail markdown={markdown} />}
      actions={
        <ActionPanel>
          <Action icon={Icon.Key} title="Add Api Key" onAction={openCommandPreferences} />
          <Action.OpenInBrowser title="Open Smithery Docs" url="https://smithery.ai/docs" />
        </ActionPanel>
      }
    />
  );
}

function Registry(props: RegistryProps) {
  const { data, isLoading, pagination } = useServers(props.searchText);

  useEffect(() => {
    if (props.setIsLoading && props.isLoading !== isLoading) {
      props.setIsLoading(isLoading);
    }
  }, [isLoading, props.setIsLoading, props.isLoading]);

  useEffect(() => {
    if (
      props.setPagination &&
      (props.pagination?.pageSize !== pagination?.pageSize || props.pagination?.hasMore !== pagination?.hasMore)
    ) {
      props.setPagination(pagination);
    }
  }, [pagination, props.setPagination, props.pagination]);

  return (
    <>
      {data?.map((server) => (
        <List.Item
          key={server.qualifiedName}
          title={server.displayName}
          subtitle={props.isShowingDetail ? undefined : server.qualifiedName}
          accessories={[
            {
              icon: Icon.Bolt,
              text: numeral(server.useCount).format("0a"),
              tooltip: `Used ${server.useCount.toLocaleString()} times last month`,
            },
          ]}
          detail={<ServerDetail server={server} />}
          actions={
            <ActionPanel>
              <InstallServerAction server={server} />
              <Action.OpenInBrowser url={server.homepage} />
              <ToggleDetailsAction isShowingDetail={props.isShowingDetail} setShowingDetail={props.setShowingDetail} />
            </ActionPanel>
          }
        />
      ))}
    </>
  );
}

function ServerDetail({ server }: { server: Server }) {
  const { data, isLoading } = useServerDetails(server);

  if (!data) {
    return <List.Item.Detail isLoading={isLoading} />;
  }

  const markdown = `# ${data?.displayName ?? server.displayName}\n\n${server.description}${
    data?.tools?.length
      ? `\n\n## Tools\n\n${data.tools.map((tool) => `### ${tool.name}\n\n${tool.description}`).join("\n")}`
      : ""
  }${
    data?.connections?.length
      ? `\n\n## Connections\n\n${data.connections.map((connection) => `### ${connection.type}\n\n\`\`\`json\n${JSON.stringify(connection, null, 2)}\n\`\`\``).join("\n")}`
      : ""
  }`;

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Qualified Name" text={server.qualifiedName} />
          {data?.tools && <List.Item.Detail.Metadata.Separator />}
          {data?.tools && (
            <List.Item.Detail.Metadata.Label
              title="Tools"
              icon={data.tools.length > 0 ? Icon.Hammer : undefined}
              text={data.tools.length.toString()}
            />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Type"
            icon={data?.remote ? Icon.Globe : Icon.Terminal}
            text={data?.remote ? "Remote" : "Local"}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Security"
            icon={data?.security?.scanPassed ? Icon.Shield : { source: Icon.Warning, tintColor: Color.Yellow }}
            text={data?.security?.scanPassed ? "Scan Passed" : { value: "Scan Not Passed", color: Color.Yellow }}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Used Last Month" text={server.useCount.toLocaleString()} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Created At" text={new Date(server.createdAt).toLocaleDateString()} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function InstallServerAction(props: { server: Server }) {
  const { data } = useServerDetails(props.server);

  const firstConnection = data?.connections?.[0];

  if (firstConnection && Object.keys(firstConnection.configSchema.properties || {}).length > 0) {
    return (
      <Action.Push
        icon={Icon.ArrowDownCircle}
        title="Configure Server"
        target={<ConfigureServerForm connection={firstConnection} server={props.server} />}
      />
    );
  }

  return <InstallSmitheryServerAction server={props.server} />;
}

function ConfigureServerForm(props: { connection: Connection; server: Server }) {
  const configSchema = props.connection.configSchema;
  const exampleConfig = props.connection.exampleConfig;
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});

  return (
    <Form
      actions={
        <ActionPanel>
          <InstallSmitheryServerAction server={props.server} config={formValues} />
        </ActionPanel>
      }
    >
      {Object.entries(configSchema.properties || {}).map(([key, schema]) => {
        const property = schema as JSONSchema7;
        const defaultValue = exampleConfig?.[key]?.toString() || property.default?.toString() || "";
        return (
          <Form.TextField
            key={key}
            id={key}
            title={property.title || key}
            placeholder={property.description}
            defaultValue={defaultValue}
            onChange={(value) => {
              setFormValues((prev) => ({ ...prev, [key]: value }));
            }}
          />
        );
      })}
    </Form>
  );
}

function InstallSmitheryServerAction(props: { server: Server; config?: Record<string, unknown> }) {
  const { data, isLoading } = useApplications();

  const installedClients = useMemo(
    () => SUPPORTED_CLIENTS.filter((client) => data?.some((app) => app.bundleId === client.bundleId)),
    [data],
  );

  const args = [
    "-y",
    "@smithery/cli",
    "run",
    props.server.qualifiedName,
    "--key",
    preferences.smitheryApiKey as string,
  ];

  if (props.config) {
    args.push("--config", `'${JSON.stringify(props.config)}'`);
  }

  return (
    <ActionPanel.Submenu title="Install Server" isLoading={isLoading}>
      <Action.InstallMCPServer
        icon={{ source: { light: Icon.RaycastLogoPos, dark: Icon.RaycastLogoNeg } }}
        title="Raycast"
        server={{
          transport: "stdio" as const,
          name: props.server.displayName,
          description: props.server.description,
          command: "npx",
          args,
        }}
      />
      <ActionPanel.Section>
        {installedClients.map((client) => (
          <InstallServerToClientAction
            key={client.bundleId}
            registryEntry={{
              name: props.server.qualifiedName,
              title: props.server.displayName,
              description: props.server.description,
              configuration: {
                command: "npx",
                args,
              },
            }}
            client={client}
          />
        ))}
      </ActionPanel.Section>
    </ActionPanel.Submenu>
  );
}
