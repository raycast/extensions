import { ActionPanel, Action, List } from "@raycast/api";
import { useState, useEffect } from "react";
import { prettyBytes } from "../utils";
import { GetConnections } from "./client/ws";
import { ConnectionT } from "./types";

function renderTitle(mode: boolean, connection: ConnectionT): string {
  return `${connection.metadata.host ? connection.metadata.host : connection.metadata.destinationIP}:${
    connection.metadata.destinationPort
  }`;
}

function renderSubTitle(mode: boolean, connection: ConnectionT): string {
  if (mode) {
    return `${connection.chains.join(" / ")}`;
  } else {
    return `${connection.rule}(${connection.rulePayload})`;
  }
}

function renderAccessoryTitle(mode: boolean, connection: ConnectionT): string {
  if (mode) {
    return `${prettyBytes(connection.download)} ↓ ${prettyBytes(connection.upload)} ↑`;
  } else {
    return `${connection.metadata.type}(${connection.metadata.network})`;
  }
}

export default function Conns(): JSX.Element {
  const [connectionsUrl, connections] = GetConnections();
  const [mode, setMode] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState(connections.connections);

  useEffect(() => {
    filterList(
      connectionsUrl
        ? connections.connections.filter(
            (item: ConnectionT) =>
              item.metadata.host.includes(searchText) ||
              item.metadata.destinationIP.includes(searchText) ||
              item.metadata.destinationPort.includes(searchText),
          )
        : ([] as Array<ConnectionT>),
    );
  }, [searchText, connections.connections.length]);

  return (
    <List enableFiltering={false} onSearchTextChange={setSearchText}>
      {connectionsUrl ? (
        <>
          <List.Item
            key={-1}
            title={"Host"}
            subtitle={mode ? "Chains" : "Rules"}
            accessoryTitle={`${mode ? "Overview" : "Detail"} Mode`}
            actions={
              <ActionPanel>
                <Action
                  title="Switch Mode"
                  onAction={() => {
                    setMode((oldMode) => !oldMode);
                  }}
                />
              </ActionPanel>
            }
          />
          {filteredList.map((connection: ConnectionT, index) => {
            return (
              <List.Item
                key={index}
                title={renderTitle(mode, connection)}
                subtitle={renderSubTitle(mode, connection)}
                accessoryTitle={renderAccessoryTitle(mode, connection)}
                actions={
                  <ActionPanel>
                    <Action
                      title="Switch Mode"
                      onAction={() => {
                        setMode((oldMode) => !oldMode);
                      }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </>
      ) : (
        <></>
      )}
    </List>
  );
}
