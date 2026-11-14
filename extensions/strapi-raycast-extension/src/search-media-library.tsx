import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { fileUrl } from "./lib/api";
import { useFiles } from "./lib/services";
import { formatSize } from "./lib/utils";
import { StrapiFile } from "./types";

const fileIcon = (mime: string) => {
  if (mime.startsWith("image/")) return Icon.Image;
  if (mime.startsWith("video/")) return Icon.Video;
  if (mime.startsWith("audio/")) return Icon.Music;
  if (mime === "application/pdf") return Icon.Document;
  return Icon.BlankDocument;
};

export default function SearchMediaLibrary() {
  const [search, setSearch] = useState("");
  const { data, isLoading, error, pagination } = useFiles(search);

  return (
    <List
      isShowingDetail={!!data?.length}
      isLoading={isLoading}
      filtering={false}
      throttle
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search files"
      pagination={pagination}
    >
      {error ? (
        <ErrorView error={error} />
      ) : (
        data?.map((file) => {
          const url = fileUrl(file);

          return (
            <List.Item
              key={file.id}
              icon={fileIcon(file.mime)}
              title={file.name}
              detail={<FileDetail file={file} url={url} />}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy URL" content={url} />
                  <Action.OpenInBrowser title="Open in Browser" url={url} />
                  <Action.CopyToClipboard
                    title="Copy Markdown"
                    content={
                      file.mime.startsWith("image/")
                        ? `![${file.alternativeText ?? file.name}](${url})`
                        : `[${file.name}](${url})`
                    }
                    shortcut={Keyboard.Shortcut.Common.CopyPath}
                  />
                  <Action.CopyToClipboard
                    title="Copy File ID"
                    content={file.id.toString()}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function FileDetail({ file, url }: { file: StrapiFile; url: string }) {
  const labels = [
    ["Alternative Text", file.alternativeText],
    ["Caption", file.caption],
    ["Mime Type", file.mime],
    ["Dimensions", file.width && file.height ? `${file.width} × ${file.height}` : null],
    ["Size", formatSize(file.size)],
  ] as const;

  return (
    <List.Item.Detail
      markdown={file.mime.startsWith("image/") ? `![${file.name}](${url})` : `**${file.name}**`}
      metadata={
        <List.Item.Detail.Metadata>
          {labels.map(([title, text]) =>
            text ? <List.Item.Detail.Metadata.Label key={title} title={title} text={text} /> : null,
          )}
          <List.Item.Detail.Metadata.Link title="URL" target={url} text={url} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
