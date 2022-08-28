import { ActionPanel, Action, Icon, List, useNavigation, updateCommandMetadata } from "@raycast/api";
import { PortForwardGroup, getPortForwardGroups, getPortDescription } from "./ssh";
import { useEffect, useState } from "react";
import { PortForwardGroupSection } from "./PortForwardGroupSection";
import NewTunnel from "./NewTunnel";

interface State {
    items?: PortForwardGroup[];
    error?: Error;
}

export default function Command() {
    const [state, setState] = useState<State>({});
    const { push } = useNavigation();

    useEffect(() => {
        async function fetchData() {
            try {
                const groups = await getPortForwardGroups();
                setState({ items: groups });

                const subtitle = groups.reduce((p, v) => {
                    return p + `${v.host} ${getPortDescription(v.fwds, false)} `;
                }, "");

                updateCommandMetadata({ subtitle: subtitle != "" ? subtitle : "Manage active tunnels." });
            } catch (error) {
                setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
            }
        }

        fetchData();
        setInterval(fetchData, 1000);
    }, []);

    return (
        <List isLoading={!state.items && !state.error}>
            <List.Item
                icon={Icon.Plus}
                title="New Port Forward"
                actions={
                    <ActionPanel>
                        <Action
                            title="Go"
                            onAction={() => {
                                push(<NewTunnel />);
                            }}
                        />
                    </ActionPanel>
                }
            />
            {/* </List.Section> */}
            {state.items?.map((item, index) => (
                <PortForwardGroupSection key={index} item={item} index={index} />
            ))}
        </List>
    );
}
