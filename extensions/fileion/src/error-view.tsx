import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { BusyError, KEYS_URL } from "./lib";

/** The empty view for a failed request. The free limit (a 429 that the quiet retry did not clear) gets its own wording and two ways out. */
export function ErrorView({ error, title, onRetry }: { error: Error; title: string; onRetry?: () => void }) {
    if (error instanceof BusyError) {
        return (
            <List.EmptyView
                icon={Icon.Key}
                title="You've reached the free limit"
                description="Fileion's API allows a limited number of requests a minute without a key. Create a free key for higher limits, or try again in a minute."
                actions={
                    <ActionPanel>
                        <Action.OpenInBrowser title="Create a Free API Key" url={KEYS_URL} />
                        <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
                        {onRetry ? <Action title="Try Again" onAction={onRetry} /> : null}
                    </ActionPanel>
                }
            />
        );
    }
    return (
        <List.EmptyView
            icon={Icon.ExclamationMark}
            title={title}
            description={error.message}
            actions={
                onRetry ? (
                    <ActionPanel>
                        <Action title="Try Again" onAction={onRetry} />
                    </ActionPanel>
                ) : undefined
            }
        />
    );
}
