import { Action, ActionPanel, getFrontmostApplication, Icon, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { primaryAction } from "../lib/preferences";

// export const copyAction = (key: string) => (
//     <Action.CopyToClipboard content={key} shortcut={{ modifiers: ["cmd"], key: "c" }} />
// );

// export const pasteAction = (key: string, frontmostAppName?: string) => (
//     <Action.Paste
//         content={key}

export const CopyActionPanel = ({ name, omitText }: { name: string; omitText?: boolean }) => {
    const { data: frontmostApp } = usePromise(getFrontmostApplication, []);

    const copyAction = useMemo(
        () => <Action.CopyToClipboard content={name} shortcut={Keyboard.Shortcut.Common.Copy} />,
        [name],
    );

    const pasteAction = useMemo(
        () => (
            <Action.Paste
                content={name}
                title={`Paste${omitText ? "" : `" ${name}"`} to ${frontmostApp?.name || "Active App"}`}
                shortcut={{
                    Windows: { modifiers: ["ctrl", "shift"], key: "v" },
                    macOS: { modifiers: ["cmd", "shift"], key: "v" },
                }}
                icon={frontmostApp ? { fileIcon: frontmostApp.path } : Icon.Clipboard}
            />
        ),
        [name, frontmostApp],
    );

    const mainPanel = useMemo(() => {
        if (primaryAction === "copy") {
            return (
                <>
                    {copyAction}
                    {pasteAction}
                </>
            );
        } else {
            return (
                <>
                    {pasteAction}
                    {copyAction}
                </>
            );
        }
    }, [copyAction, pasteAction, primaryAction]);

    return <ActionPanel>{mainPanel}</ActionPanel>;
};
