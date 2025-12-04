import { List } from "@raycast/api";
import { ServerCloudType, ServerLogType, ServerType } from "../../type/server";

export const ServerListView = ({
  title,
  servers,
  selectedServer,
  actionPanel,
}: {
  title: string;
  servers: ServerType[];
  selectedServer: string | null;
  actionPanel: (server: ServerType) => JSX.Element;
}) => (
  <List.Section title={title} subtitle={servers.length.toLocaleString()}>
    {servers.map((server: ServerType) => (
      <ServerListItem
        key={server.server_id}
        server={server}
        selectedServer={selectedServer}
        actionPanel={actionPanel}
      />
    ))}
  </List.Section>
);

export const ServerListItem = ({
  server,
  selectedServer,
  actionPanel,
}: {
  server: ServerType;
  selectedServer: string | null;
  actionPanel: (server: ServerType) => JSX.Element;
}) => {
  return (
    <List.Item
      id={server.server_id}
      key={server.server_id}
      title={server.server_name}
      subtitle={server.expires}
      detail={<ModelDetailView server={server} />}
      actions={selectedServer === server.server_id ? actionPanel(server) : undefined}
    />
  );
};

const ModelDetailView = (props: { server: ServerType; markdown?: string | null | undefined }) => {
  const { server } = props;
  let markdown = "";
  if (server.clouds && server.clouds.length > 0) {
    markdown += `*Clouds*\n\n`;
    {
      server.clouds?.map(
        (x: ServerCloudType) =>
          (markdown += `***${x.srvID}***\n\n Port: ${x.port_nr}\n Expires: ${x.expires}\n\nSize: ${x.size}\n Disk: ${x.disk_used}/${x.disk_total}\n CPU percent: ${x.cpu_percent}\n RAM used: ${x.ram_used}/${x.ram_total}\n\n`),
      );
    }
  }
  markdown += `-------------------\n\n`;
  markdown += `*Logs*\n\n`;
  {
    server.logs?.map(
      (x: ServerLogType) => (markdown += `***${x.task}***\n\n ${x.when_created} - ${x.when_done}\n\n ${x.output}\n`),
    );
  }

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Id" text={server.info?.server_id} />
          <List.Item.Detail.Metadata.Label title="Name" text={server.info?.server_name} />
          <List.Item.Detail.Metadata.Label title="Expires" text={server.info?.expires} />
          <List.Item.Detail.Metadata.Label title="Expires Cytrus" text={server.info?.expires_cytrus ?? ""} />
          <List.Item.Detail.Metadata.Label title="Expires Storage" text={server.info?.expires_storage ?? ""} />
          <List.Item.Detail.Metadata.Label title="Ram" text={server.info?.param_ram} />
          <List.Item.Detail.Metadata.Label title="Disk" text={server.info?.param_disk} />
          <List.Item.Detail.Metadata.Label title="Last login panel" text={server.info?.lastlog_panel} />
          <List.Item.Detail.Metadata.Label
            title="Pro activated"
            text={server.info ? (server.info?.mikrus_pro === "nie" ? "no" : "YES") : ""}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Ports" text={server.ports?.join(", ")} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Api"
            text={server.apiKey ? server.apiKey.substring(0, 5) + "..." : ""}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
};
