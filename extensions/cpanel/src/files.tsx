import InvalidUrl from "./lib/components/invalid-url";
import { useListFiles } from "./lib/hooks";
import { isInvalidUrl } from "./lib/utils";
import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { File } from "./lib/types";

function getIcon(file: File): Image.ImageLike {
  switch (file.file) {
    case "mail":
      return { source: Icon.Envelope, tintColor: Color.Blue };
    case "public_ftp":
      return { source: "fa-solid--exchange-alt.svg", tintColor: Color.Green };
    case "public_html":
      return { source: Icon.Globe, tintColor: Color.Blue };
    default:
      break;
  }
  switch (file.type) {
    case "dir":
      return { source: Icon.Folder, tintColor: Color.Yellow };
    case "file":
      return { source: Icon.Document, tintColor: Color.Purple };
    case "link":
      return Icon.Link;
  }
}

export default function Files() {
  if (isInvalidUrl()) return <InvalidUrl />;

  return <Directory dir="/" />;
}

function Directory({ dir }: { dir: string }) {
  const { isLoading, data: files } = useListFiles(dir);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search file">
      <List.Section title={dir} subtitle={`${files?.length} items`}>
        {files?.map((file) => (
          <List.Item
            key={file.fullpath}
            title={file.file}
            subtitle={file.path}
            accessories={[{ text: file.humansize }, { date: new Date(file.mtime * 1000) }]}
            icon={getIcon(file)}
            actions={
              <ActionPanel title="Go To">
                {file.type === "dir" && (
                  <Action.Push
                    icon={Icon.ArrowRight}
                    title={"/" + file.file}
                    target={<Directory dir={file.fullpath} />}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
