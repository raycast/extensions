import { List, ActionPanel, Action } from "@raycast/api";
import { truncateFileName, truncateUrl, getFileIcon } from "./utils/fileUtils";
import type { RecentUpload } from "./utils/recentUploads";

export type UploadedLink = RecentUpload;

function getAccessLabel(type?: RecentUpload["type"]): "Public" | "Private" {
  return type === "public" ? "Public" : "Private";
}

export function UploadedFileListItem({ link }: { link: UploadedLink }) {
  return (
    <List.Item
      key={link.id ?? link.url}
      title={truncateFileName(link.file, 32)}
      icon={getFileIcon(link.file, link.url)}
      accessories={
        [
          link.type === "presigned"
            ? { tag: `Expires ${link.expiry ? Math.round(link.expiry / 3600) + "h" : "?"}` }
            : undefined,
          { date: new Date(link.uploadedAt), tooltip: new Date(link.uploadedAt).toLocaleString() },
        ].filter(Boolean) as { date?: Date; tooltip?: string; tag?: string }[]
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="File Name" text={link.file} />
              <List.Item.Detail.Metadata.Label title="Access" text={getAccessLabel(link.type)} />
              <List.Item.Detail.Metadata.Link title="Link" target={link.url} text={truncateUrl(link.url, 60)} />
              <List.Item.Detail.Metadata.Label title="Uploaded" text={new Date(link.uploadedAt).toLocaleString()} />
              {link.type === "presigned" && (
                <List.Item.Detail.Metadata.Label
                  title="Expiry"
                  text={link.expiry ? `${Math.round(link.expiry / 3600)}h` : "?"}
                />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={link.url} />
          <Action.OpenInBrowser url={link.url} />
        </ActionPanel>
      }
    />
  );
}

export function UploadedLinksScreen({ links, navigationTitle }: { links: UploadedLink[]; navigationTitle: string }) {
  return (
    <List navigationTitle={navigationTitle} isShowingDetail>
      {links.map((link) => (
        <UploadedFileListItem key={link.id ?? link.url} link={link} />
      ))}
    </List>
  );
}
