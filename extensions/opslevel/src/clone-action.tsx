import {
    Action,
    ActionPanel,
    Clipboard,
    getApplications,
    getPreferenceValues,
    open,
    showHUD,
    showToast,
    Toast,
    Icon,
} from "@raycast/api";
import { promises as fs } from "fs";
import { LocalStorage } from "@raycast/api";
import { usePromise } from "@raycast/utils";

const checkoutLocation = getPreferenceValues()["checkoutLocation"];

async function getEditor(rootPath: string) {
    return await LocalStorage.getItem<string>(`preferred-editor:${rootPath}`);
}

async function setEditor(rootPath: string, editor: string) {
    return await LocalStorage.setItem(`preferred-editor:${rootPath}`, editor);
}

function repoInfo(checkoutLocation: string, repoUrl: string) {
    const repoName = repoUrl.split("/").pop();
    const repoPath = `${checkoutLocation}/${repoName}`;
    return { repoName, repoPath };
}

async function folderExists(folderPath: string) {
    try {
        await fs.access(folderPath);
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function selectEditor(editorBundleId: string, repoPath: string, repoUrl: string) {
    await setEditor(repoPath, editorBundleId);

    if (!(await folderExists(repoPath))) {
        Clipboard.copy(`git clone ${repoUrl} ${repoPath}`);
        showHUD("Repository not cloned. Clone command copied to clipboard");
    }

    try {
        await open(repoPath, editorBundleId);
    } catch (error) {
        showToast({
            style: Toast.Style.Failure,
            title: "Failed to open editor",
            message: error instanceof Error ? error.message : String(error),
        });
    }
}

export default function OpenRepoInEditorAction({
    repoUrl,
    onVisisted,
}: {
    repoUrl: string | undefined | null;
    onVisisted: () => void;
}) {
    if (!repoUrl) return null;

    const { repoPath } = repoInfo(checkoutLocation, repoUrl);
    const { isLoading: isEditorLoading, data: editorBundleId } = usePromise(
        async (rp: string) => await getEditor(rp),
        [repoPath]
    );
    const { isLoading: isApplicationsLoading, data: applications } = usePromise(
        async () => await getApplications(),
        []
    );

    return (
        <ActionPanel.Section>
            {isEditorLoading || isApplicationsLoading ? (
                <Action title="Loading..." icon={Icon.Ellipsis} />
            ) : (
                [
                    editorBundleId ? (
                        <Action
                            key="open-in-editor"
                            // eslint-disable-next-line @raycast/prefer-title-case
                            title={`Open In ${
                                applications?.find((app) => app.bundleId === editorBundleId)?.name ?? "Unknown"
                            }`}
                            icon={Icon.Pencil}
                            shortcut={{ modifiers: ["cmd"], key: "o" }}
                            onAction={async () => {
                                onVisisted();
                                await selectEditor(editorBundleId, repoPath, repoUrl);
                            }}
                        />
                    ) : null,
                    <ActionPanel.Submenu
                        key="open-in-choice"
                        title="Open in ..."
                        icon={Icon.Pencil}
                        isLoading={isApplicationsLoading}
                        onOpen={onVisisted}
                    >
                        {applications?.map((app) => (
                            <Action
                                key={`open-in-${app.bundleId}`}
                                icon={{ fileIcon: app.path }}
                                title={app.name}
                                onAction={async () => await selectEditor(app.bundleId ?? "", repoPath, repoUrl)}
                            />
                        ))}
                    </ActionPanel.Submenu>,
                ]
            )}
        </ActionPanel.Section>
    );
}
