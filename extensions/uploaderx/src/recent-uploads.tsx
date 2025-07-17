import { List, ActionPanel, Action, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { truncateFileName, getFileIcon } from "./utils/fileUtils";

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString();
}

function UploadedFileListItem({
  link,
}: {
  link: { file: string; url: string; uploadedAt: number; type?: "public" | "presigned"; expiry?: number };
}) {
  return (
    <List.Item
      key={link.url + link.uploadedAt}
      title={truncateFileName(link.file)}
      subtitle={link.url}
      icon={getFileIcon(link.file, link.url)}
      accessories={
        [
          link.type === "presigned"
            ? { tag: `Expires in ${link.expiry ? Math.round(link.expiry / 3600) + "h" : "?"}` }
            : link.type === "public" || link.type === "private"
              ? { tag: link.type === "public" ? "Public" : "Private" }
              : undefined,
          { date: new Date(link.uploadedAt), tooltip: formatDate(link.uploadedAt) },
        ].filter(Boolean) as Exclude<typeof undefined, undefined>[]
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="File Name" text={link.file} />
              <List.Item.Detail.Metadata.Link title="Link" target={link.url} text={link.url} />
              <List.Item.Detail.Metadata.Label title="Uploaded" text={formatDate(link.uploadedAt)} />
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

export default function Command() {
  const [uploads, setUploads] = useState<
    { file: string; url: string; uploadedAt: number; type?: "public" | "presigned"; expiry?: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const raw = (await LocalStorage.getItem<string>("recentUploads")) || "[]";
      let arr: { file: string; url: string; uploadedAt: number; type?: "public" | "presigned"; expiry?: number }[] = [];
      try {
        arr = JSON.parse(raw);
      } catch {
        // Ignore JSON parse errors and use empty array
      }
      setUploads(arr);
      setLoading(false);
    })();
  }, []);

  return (
    <List isLoading={loading} navigationTitle="Recent Uploads" isShowingDetail>
      {uploads.length === 0 ? (
        <List.EmptyView title="No uploads yet" description="Uploaded files will appear here." />
      ) : (
        uploads.map((item) => <UploadedFileListItem key={item.url + item.uploadedAt} link={item} />)
      )}
    </List>
  );
}
