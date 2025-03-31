import { Action, ActionPanel, Icon, getPreferenceValues } from "@raycast/api";
import type { SnippetsLab } from "../hooks/useSnippetsLab";
import type { Fragment } from "../models/fragment";
import type { Preferences } from "../models/preferences";
import type { Snippet } from "../models/snippet";
import { SnippetDetails } from "./details";

interface SnippetActionsProps {
    app: SnippetsLab;
    snippet: Snippet;

    /**
     * An optional fragment to use for the actions. If not provided, the suggested fragment of the
     * snippet will be used, which is the first fragment that matches the search query.
     */
    fragment?: Fragment;

    /** Whether to include the "show details" action. */
    allowsPush?: boolean;
}

/** Raw values must be kept in sync with preferences. */
enum ActionType {
    COPY_TO_CLIPBOARD = "copy",
    PASTE_TO_ACTIVE_APP = "paste",
    OPEN_IN_SNIPPETSLAB = "open",
    SHOW_DETAILS = "push",
}

/** Action panel for a single snippet. */
export function SnippetActions({ app, snippet, fragment, allowsPush }: SnippetActionsProps) {
    const preferences = getPreferenceValues<Preferences>();
    const actualFragment = fragment || snippet.suggestedFragment;

    const getActionComponent = (action: string) => {
        switch (action) {
            case ActionType.COPY_TO_CLIPBOARD:
                return (
                    <Action.CopyToClipboard
                        key={action}
                        title="Copy to Clipboard"
                        icon={Icon.Clipboard}
                        content={actualFragment.content}
                    />
                );
            case ActionType.PASTE_TO_ACTIVE_APP:
                return (
                    <Action.Paste
                        key={action}
                        title="Paste to Active App"
                        icon={Icon.Text}
                        content={actualFragment.content}
                    />
                );
            case ActionType.OPEN_IN_SNIPPETSLAB:
                return (
                    <Action
                        key={action}
                        title="Open in SnippetsLab"
                        icon="app-icon-sm.png"
                        onAction={async () => await app.open(snippet.uuid, actualFragment.uuid)}
                    />
                );
            case ActionType.SHOW_DETAILS:
                return allowsPush ? (
                    <Action.Push
                        key={action}
                        title="Show Details"
                        icon={Icon.Eye}
                        target={<SnippetDetails app={app} snippet={snippet} />}
                    />
                ) : null;
            default:
                return null;
        }
    };

    const actions = new Set<string>();

    actions.add(preferences.primaryAction);
    actions.add(preferences.secondaryAction);

    // The default ordering for any actions that is not primary or secondary.
    actions.add(ActionType.SHOW_DETAILS);
    actions.add(ActionType.COPY_TO_CLIPBOARD);
    actions.add(ActionType.OPEN_IN_SNIPPETSLAB);
    actions.add(ActionType.PASTE_TO_ACTIVE_APP);

    return (
        <ActionPanel>{Array.from(actions).map((action) => getActionComponent(action))}</ActionPanel>
    );
}
