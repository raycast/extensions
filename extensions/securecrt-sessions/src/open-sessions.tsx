import {
    Action,
    ActionPanel,
    Clipboard,
    closeMainWindow,
    getPreferenceValues,
    Icon,
    List,
    Toast,
    showToast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

import { openSession } from "./securecrt";
import { loadSessions, readSessionMetadata, type Session } from "./sessions";

type Preferences = {
    securecrtConfigPath?: string;
    securecrtExecutablePath?: string;
    showHostnames?: boolean;
};

export default function Command() {
    const preferences = getPreferenceValues<Preferences>();
    const showMetadata = preferences.showHostnames ?? true;
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
        setIsLoading(true);

        try {
            const result = await loadSessions(preferences.securecrtConfigPath, showMetadata);
            setSessions(result);
        } catch (err) {
            setSessions([]);
            await showToast({
                style: Toast.Style.Failure,
                title: "Failed to load sessions",
                message: err instanceof Error ? err.message : String(err),
            });
        } finally {
            setIsLoading(false);
        }
    }, [preferences.securecrtConfigPath, showMetadata]);

    async function handleOpen(sessionPath: string) {
        try {
            await openSession(sessionPath, preferences.securecrtExecutablePath);
            await closeMainWindow();
        } catch (err) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Failed to open session",
                message: err instanceof Error ? err.message : String(err),
            });
        }
    }

    async function handleCopyHostname(session: Session) {
        const hostname = session.hostname ?? (await readSessionMetadata(session.filePath)).hostname;

        if (!hostname) {
            await showToast({
                style: Toast.Style.Failure,
                title: "No hostname found",
                message: session.name,
            });
            return;
        }

        await Clipboard.copy(hostname);
        await showToast({
            style: Toast.Style.Success,
            title: "Hostname copied",
            message: hostname,
        });
    }

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return (
        <List isLoading={isLoading} searchBarPlaceholder="Search SecureCRT sessions...">
            {sessions.map((session) => (
                <List.Item
                    key={session.filePath}
                    title={session.name}
                    subtitle={showMetadata ? session.hostname : undefined}
                    accessories={
                        showMetadata
                            ? [{ text: session.sessionPath }, { text: session.protocol }]
                            : [{ text: session.sessionPath }]
                    }
                    icon={Icon.Terminal}
                    keywords={
                        showMetadata
                            ? [session.name, session.sessionPath, session.hostname ?? ""]
                            : [session.name, session.sessionPath]
                    }
                    actions={
                        <ActionPanel>
                            <Action
                                title="Open Session"
                                icon={Icon.Play}
                                onAction={() => void handleOpen(session.sessionPath)}
                            />
                            <Action
                                title="Copy Hostname"
                                icon={Icon.Clipboard}
                                shortcut={{ modifiers: ["cmd"], key: "c" }}
                                onAction={() => void handleCopyHostname(session)}
                            />
                            <Action
                                title="Reload Sessions"
                                icon={Icon.ArrowClockwise}
                                onAction={() => void refresh()}
                            />
                        </ActionPanel>
                    }
                />
            ))}
        </List>
    );
}
