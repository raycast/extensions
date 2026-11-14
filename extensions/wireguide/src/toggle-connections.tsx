import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { connect, disconnect, listConnections } from "./client";
import { useInterval } from "usehooks-ts";
import prettyBytes from "pretty-bytes";

const searchBarPlaceholder = "Search connections…";

export default function Command() {
    const { isLoading, data, error, mutate, revalidate } = usePromise(listConnections);

    useInterval(revalidate, error ? null : 1000);

    if (error) {
        return (
            <List isLoading={isLoading} searchBarPlaceholder={searchBarPlaceholder}>
                <List.EmptyView
                    title="Failed to load connections"
                    description={error.message}
                    icon={{ source: Icon.Warning, tintColor: Color.Red }}
                    actions={
                        <ActionPanel>
                            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
                            <Action
                                title="Open Extension Preferences"
                                icon={Icon.Gear}
                                onAction={openExtensionPreferences}
                            />
                        </ActionPanel>
                    }
                />
            </List>
        );
    }

    if (data?.length === 0) {
        return (
            <List isLoading={isLoading} searchBarPlaceholder={searchBarPlaceholder}>
                <List.EmptyView title="No connections" icon={Icon.Leaf} />
            </List>
        );
    }

    return (
        <List isLoading={isLoading} searchBarPlaceholder={searchBarPlaceholder}>
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
        </List>
    );
}
