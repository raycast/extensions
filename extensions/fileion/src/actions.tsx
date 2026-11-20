import { Action, ActionPanel, Keyboard } from "@raycast/api";
import { Software, downloadPlatforms, downloadUrl, platformName, versionsUrl } from "./lib";

/**
 * The actions of one title: "Download for Mac" first when it has a Mac version, then Windows, Linux, Android, iOS (each opens Fileion's own
 * download page for that platform, never a vendor file), then Open on Fileion, copy the link and the versions page. $preferred puts that
 * platform's download first (a row that is already about one platform).
 */
export function TitleActions({
    url,
    platforms,
    latest,
    preferred,
}: {
    url: string;
    platforms: string[];
    latest?: Software["latest"];
    preferred?: string;
}) {
    const list = downloadPlatforms({ platforms, latest }, preferred);
    const versions = preferred ?? list[0];
    return (
        <ActionPanel>
            {list.map((p) => (
                <Action.OpenInBrowser key={p} title={`Download for ${platformName(p)}`} url={downloadUrl(url, p)} />
            ))}
            <Action.OpenInBrowser title="Open on Fileion" url={url} />
            <Action.CopyToClipboard title="Copy Fileion URL" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
            {versions ? (
                <Action.OpenInBrowser
                    title="Open Versions Page"
                    url={versionsUrl({ url } as Software, versions)}
                    shortcut={{ modifiers: ["cmd"], key: "v" }}
                />
            ) : null}
        </ActionPanel>
    );
}
