import { Action, ActionPanel, Alert, Color, Icon, Keyboard, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { LinkStatus, getLinkStatus, isOwnLink, removeLink } from "./links";
import { SymlinkRecord, getSymlinks, removeSymlink } from "./storage";

interface Entry extends SymlinkRecord {
    status: LinkStatus;
}

const STATUS_ACCESSORY: Record<LinkStatus, List.Item.Accessory> = {
    ok: { icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Valid symlink" },
    broken: {
        icon: { source: Icon.ExclamationMark, tintColor: Color.Orange },
        tooltip: "Broken: the source no longer exists",
    },
    missing: { icon: { source: Icon.XMarkCircle, tintColor: Color.Red }, tooltip: "The symlink no longer exists" },
    replaced: {
        icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
        tooltip: "Something else is at the symlink's path now",
    },
    unknown: { icon: { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText }, tooltip: "Couldn't check" },
};

function deleteMessage({ status, destination }: Entry) {
    switch (status) {
        case "ok":
        case "broken":
            return `This removes the symlink at ${destination}. What it points to is not touched.`;
        case "missing":
            return "The symlink is already gone, so only the entry is removed.";
        default:
            return `${destination} is no longer this symlink, so it is left alone and only the entry is removed.`;
    }
}

async function loadEntries(): Promise<Entry[]> {
    return getSymlinks().map((record) => ({ ...record, status: getLinkStatus(record) }));
}

export default function Command() {
    const { data: entries = [], isLoading, revalidate } = usePromise(loadEntries);

    async function deleteEntry(entry: Entry) {
        const confirmed = await confirmAlert({
            title: `Delete "${entry.name}"?`,
            message: deleteMessage(entry),
            primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
        });
        if (!confirmed) return;

        try {
            // removeLink checks the path again right before unlinking, so it never removes anything but our link.
            if (isOwnLink(entry.status)) await removeLink(entry);
            removeSymlink(entry.destination);
            await revalidate();
            await showToast({ style: Toast.Style.Success, title: "Symlink deleted" });
        } catch (error) {
            await showFailureToast(error, { title: "Failed to delete symlink" });
        }
    }

    return (
        <List isLoading={isLoading} searchBarPlaceholder="Search symlinks...">
            {entries.map((entry) => (
                <List.Item
                    key={entry.destination}
                    title={entry.name}
                    subtitle={entry.source}
                    accessories={[STATUS_ACCESSORY[entry.status]]}
                    actions={
                        <ActionPanel>
                            <ActionPanel.Section>
                                <Action.ShowInFinder title="Show Source in Finder" path={entry.source} />
                                <Action.OpenWith
                                    title="Open Source"
                                    path={entry.source}
                                    shortcut={Keyboard.Shortcut.Common.Open}
                                />
                                <Action.OpenWith
                                    title="Open Destination"
                                    path={entry.destination}
                                    shortcut={Keyboard.Shortcut.Common.OpenWith}
                                />
                                <Action.CopyToClipboard
                                    title="Copy Source Path"
                                    content={entry.source}
                                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                                />
                                <Action.CopyToClipboard
                                    title="Copy Destination Path"
                                    content={entry.destination}
                                    shortcut={Keyboard.Shortcut.Common.Copy}
                                />
                            </ActionPanel.Section>
                            <ActionPanel.Section>
                                <Action
                                    title="Delete Symlink"
                                    icon={Icon.Trash}
                                    style={Action.Style.Destructive}
                                    shortcut={Keyboard.Shortcut.Common.Remove}
                                    onAction={() => deleteEntry(entry)}
                                />
                            </ActionPanel.Section>
                        </ActionPanel>
                    }
                />
            ))}
            {!isLoading && entries.length === 0 && (
                <List.EmptyView
                    title="No symlinks found"
                    description="Create a new symlink using the Create Symlink command"
                    icon={Icon.Link}
                />
            )}
        </List>
    );
}
