import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { CollectionProp } from "../utilities/fetch";
import SearchCollection from "../searchCollection";

interface Props {
  item: CollectionProp;
}

function itemTitle(item: CollectionProp) {
  if (item.heading) {
    return `${item.heading} > ${item.name}`;
  }
  return item.name;
}

export default function CollectionItem(props: Props) {
  const tag = props.item;
  return (
    <List.Item
      title={itemTitle(tag)}
      subtitle="Collection"
      icon={{
        source: `http://127.0.0.1:6391/sf-symbols/${tag.icon}`,
        fallback: Icon.Hashtag,
        tintColor: tag.color,
      }}
      accessories={[{ text: tag.count.toString() }]}
      id={tag.id}
      actions={
        <ActionPanel title={`${tag.name}`}>
          <Action.Push
            title="Show Links in Collection"
            icon={{
              source: `http://127.0.0.1:6391/sf-symbols/${tag.icon}`,
              fallback: Icon.Hashtag,
              tintColor: tag.color,
            }}
            target={<SearchCollection collection={tag} />}
          ></Action.Push>
        </ActionPanel>
      }
    />
  );
}
