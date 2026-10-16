import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { connect, disconnect, listConnections } from "./client";
import { useInterval } from "usehooks-ts";
import prettyBytes from "pretty-bytes";

export default function Command() {
    const { isLoading, data, mutate, revalidate } = usePromise(listConnections);

    useInterval(revalidate, 1000);

    if (data?.length === 0) {
        <List>
            <List.EmptyView title="No connections" icon={Icon.Leaf} />
        </List>;
    }

    return (
        <List isLoading={isLoading}>
            {data?.map((row, index) => (
                <List.Item
                    key={index}
                    title={row.name}
                    subtitle={row.type === "status" ? row.endpoint : undefined}
                    icon={{
                        source: row.isConnected ? Icon.CircleFilled : Icon.Circle,
                        tintColor: row.isConnected ? Color.Green : null,
                    }}
                    accessories={[
                        {
                            tag:
                                row.type === "status"
                                    ? `rx=${prettyBytes(row.rx_bytes)} tx=${prettyBytes(row.tx_bytes)}`
                                    : null,
                        },
                    ]}
                    actions={
                        <ActionPanel>
                            {row.isConnected ? (
                                <Action
                                    title="Disconnect"
                                    style={Action.Style.Destructive}
                                    onAction={() => mutate(disconnect(row.name))}
                                />
                            ) : (
                                <Action title="Connect" onAction={() => mutate(connect(row.name))} />
                            )}
                        </ActionPanel>
                    }
                />
            ))}
            {/* <List.Item
        icon={Icon.Bird}
        title="Greeting"
        actions={
          <ActionPanel>
            <Action.Push title="Show Details" target={<Detail markdown="# Hey! 👋" />} />
          </ActionPanel>
        }
      /> */}
        </List>
    );
}
