import { ActionPanel, Action } from "@raycast/api";

export function Actions(props: any) {
    return (
        <ActionPanel title={props.item.content.title}>
            <ActionPanel.Section>
                {props.item.content.url && <Action.OpenInBrowser url={props.item.content.url} />}
            </ActionPanel.Section>
            <ActionPanel.Section>
                {props.item.content.url && (
                    <Action.CopyToClipboard
                        content={props.item.content.url}
                        title="Copy Link"
                        shortcut={{ modifiers: ["cmd"], key: "." }}
                    />
                )}
            </ActionPanel.Section>
        </ActionPanel>
    )
}
