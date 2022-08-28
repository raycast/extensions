import { ActionPanel, Action, Icon, List, confirmAlert } from "@raycast/api";
import { PortForwardGroup, getPortDescription } from "./ssh";
import { kill } from "process";

export function PortForwardGroupSection(props: { item: PortForwardGroup; index: number }) {
    return (
        <List.Section title={"Tunnels to " + props.item.host} subtitle={getPortDescription(props.item.fwds)}>
            {props.item.cons.map((c) => {
                return (
                    <List.Item
                        key={c.pid}
                        icon={Icon.Link}
                        title={c.host}
                        subtitle={getPortDescription(c.fwds, true)}
                        accessoryTitle={`PID: ${c.pid}`}
                        actions={
                            <ActionPanel>
                                <Action
                                    title="Stop"
                                    onAction={async () => {
                                        if (
                                            await confirmAlert({
                                                title: `Stop this tunnel?`,
                                                message: `${c.host} ${getPortDescription(c.fwds, true)}`,
                                            })
                                        ) {
                                            kill(c.pid ? c.pid : 0, "SIGTERM");
                                        }
                                    }}
                                ></Action>
                            </ActionPanel>
                        }
                    />
                );
            })}
        </List.Section>
    );
}
