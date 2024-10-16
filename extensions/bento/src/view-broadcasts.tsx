import { useEffect, useState } from "react";
import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { getBroadcasts, Broadcast } from "./api-client";

export default function ViewBroadcasts() {
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchBroadcasts() {
            try {
                const fetchedBroadcasts = await getBroadcasts();
                setBroadcasts(fetchedBroadcasts);
            } catch (error) {
                showToast(Toast.Style.Failure, "Failed to fetch broadcasts");
            } finally {
                setIsLoading(false);
            }
        }
        fetchBroadcasts();
    }, []);

    return (
        <List isLoading={isLoading}>
            {broadcasts.map((broadcast) => (
                <List.Item
                    key={broadcast.id}
                    title={broadcast.name}
                    subtitle={`Created at: ${new Date(broadcast.created_at).toLocaleString()}`}
                    accessories={[{ text: `Open Rate: ${(broadcast.stats.open_rate * 100).toFixed(2)}%` }]}
                    actions={
                        <ActionPanel>
                            <Action.CopyToClipboard content={broadcast.share_url} title="Copy Share URL" />
                        </ActionPanel>
                    }
                />
            ))}
        </List>
    );
}