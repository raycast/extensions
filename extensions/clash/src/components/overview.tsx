import { Icon, List } from "@raycast/api";
import { prettyBytes } from "../utils";
import { GetConnections, GetTraffic } from "./client/ws";

export default function Overview(): JSX.Element {
  const [trafficUrl, traffic] = GetTraffic();
  const [connectionsUrl, connections] = GetConnections();
  return (
    <List>
      {trafficUrl && connectionsUrl ? (
        <>
          <List.Item key="1" icon={Icon.ChevronUp} title="Upload" accessoryTitle={`${prettyBytes(traffic.up)}/s`} />
          <List.Item
            key="2"
            icon={Icon.ChevronDown}
            title="Download"
            accessoryTitle={`${prettyBytes(traffic.down)}/s`}
          />
          <List.Item
            key="3"
            icon={Icon.Upload}
            title="Upload Total"
            accessoryTitle={`${prettyBytes(connections.uploadTotal)}`}
          />
          <List.Item
            key="4"
            icon={Icon.Download}
            title="Download Total"
            accessoryTitle={`${prettyBytes(connections.downloadTotal)}`}
          />
          <List.Item
            key="5"
            icon={Icon.LevelMeter}
            title="Active Connections"
            accessoryTitle={`${connections.connections.length}`}
          />
        </>
      ) : (
        <></>
      )}
    </List>
  );
}
