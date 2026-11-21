import { Action, ActionPanel, Keyboard } from "@raycast/api";

/** Open the Fileion page (the primary action), then Copy Link: the first entry of the ⌘K action panel, also ⇧⌘C */
export function PageActions({ url, title }: { url: string; title: string }) {
    return (
        <ActionPanel>
            <Action.OpenInBrowser title={title} url={url} />
            <Action.CopyToClipboard title="Copy Link" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
        </ActionPanel>
    );
}
