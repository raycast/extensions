import InvalidUrl from "./lib/components/invalid-url";
import { useListFiles } from "./lib/hooks";
import { isInvalidUrl } from "./lib/utils";
import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { FileItem } from "./lib/types";

function getIcon(item: FileItem): Image.ImageLike {
  switch (item.file) {
    case "mail":
      return { source: Icon.Envelope, tintColor: Color.Blue };
    case "public_ftp":
      return { source: Icon.Switch, tintColor: Color.Green };
    case "public_html":
      return { source: Icon.Globe, tintColor: Color.Blue };
    default:
      break;
  }
  switch (item.type) {
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
        {files?.map((item) => (
          <List.Item
            key={item.fullpath}
            title={item.file}
            subtitle={item.path}
            accessories={[
              { text: item.humansize },
              { date: new Date(item.mtime * 1000), tooltip: `modified: ${new Date(item.mtime * 1000).toDateString()}` },
            ]}
            icon={getIcon(item)}
            actions={
              <ActionPanel title="Go To">
                {item.type === "dir" && (
                  <Action.Push
                    icon={Icon.ArrowRight}
                    title={"/" + item.file}
                    target={<Directory dir={item.fullpath} />}
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
