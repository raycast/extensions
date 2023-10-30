import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { FolderProp } from "../utilities/fetch";
import SearchFolder from "../searchFolder";

interface Props {
  item: FolderProp;
}

export default function FolderItem(props: Props) {
  const folder = props.item;
  return (
    <List.Item
      title={folder.name}
      icon={{
        source: `http://127.0.0.1:6391/sf-symbols/${folder.icon}`,
        fallback: Icon.Folder,
        tintColor: folder.color,
      }}
      accessories={[{ text: "Folder" }]}
      id={folder.id}
      actions={
        <ActionPanel title={`${folder.name}`}>
          <Action.Push
            title="Show Links in Tag"
            icon={{
              source: `http://127.0.0.1:6391/sf-symbols/${folder.icon}`,
              fallback: Icon.Folder,
              tintColor: folder.color,
            }}
            target={<SearchFolder folder={folder} />}
          ></Action.Push>
        </ActionPanel>
      }
    />
  );
}
