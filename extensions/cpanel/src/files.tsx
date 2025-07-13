import InvalidUrl from "./lib/components/invalid-url";
import { useListFiles, usGetFileContent } from "./lib/hooks";
import { isInvalidUrl } from "./lib/utils";
import { Action, ActionPanel, Color, Detail, getPreferenceValues, Icon, Image, List } from "@raycast/api";
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
  const { show_raw_mime_type: showMime } = getPreferenceValues<Preferences.Files>();
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
              { tag: showMime ? item.rawmimetype : "" },
              { text: item.humansize },
              { date: new Date(item.mtime * 1000), tooltip: `modified: ${new Date(item.mtime * 1000).toDateString()}` },
            ]}
            icon={getIcon(item)}
            actions={
              <ActionPanel>
                {item.type === "dir" && (
                  <ActionPanel.Section title="Go To">
                    <Action.Push
                      icon={Icon.ArrowRight}
                      title={"/" + item.file}
                      target={<Directory dir={item.fullpath} />}
                    />
                  </ActionPanel.Section>
                )}
                {item.type === "file" && (
                  <ActionPanel.Section>
                    <Action.Push
                      icon={Icon.Eye}
                      title="View File"
                      target={<ViewFile dir={item.path} file={item.file} />}
                    />
                  </ActionPanel.Section>
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function ViewFile({ dir, file }: { dir: string; file: string }) {
  const { isLoading, data, error } = usGetFileContent(dir, file);

  const markdown = isLoading ? "# Loading..." : data ? data.content : `# Error \n\n ${error}`;
  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`View Files > ${dir}/${file}`}
      actions={<ActionPanel>{!isLoading && data && <Action.CopyToClipboard content={data.content} />}</ActionPanel>}
    />
  );
}
