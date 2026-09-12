import { ActionPanel, Action, List, Grid, Icon, getPreferenceValues } from "@raycast/api";
import { TagProp } from "../utilities/fetch";
import SearchTag from "../searchTag";

interface Props {
  item: TagProp;
}

export default function TagItem(props: Props) {
  const tag = props.item;
  const preferences = getPreferenceValues<Preferences.Search>();
  if (preferences.asIcons) {
    return (
      <Grid.Item
        title={tag.name}
        content={{
          source: `http://127.0.0.1:6391/sf-symbols/${tag.icon}`,
          fallback: Icon.Hashtag,
          tintColor: tag.color,
        }}
        subtitle="Tag"
        id={tag.id}
        actions={
          <ActionPanel title={`${tag.name}`}>
            <Action.Push
              title="Show Links in Tag"
              icon={{
                source: `http://127.0.0.1:6391/sf-symbols/${tag.icon}`,
                fallback: Icon.Hashtag,
                tintColor: tag.color,
              }}
              target={<SearchTag tag={tag} />}
            ></Action.Push>
          </ActionPanel>
        }
      />
    );
  } else {
    return (
      <List.Item
        title={tag.name}
        icon={{
          source: `http://127.0.0.1:6391/sf-symbols/${tag.icon}`,
          fallback: Icon.Hashtag,
          tintColor: tag.color,
        }}
        accessories={[{ text: "Tag" }]}
        id={tag.id}
        actions={
          <ActionPanel title={`${tag.name}`}>
            <Action.Push
              title="Show Links in Tag"
              icon={{
                source: `http://127.0.0.1:6391/sf-symbols/${tag.icon}`,
                fallback: Icon.Hashtag,
                tintColor: tag.color,
              }}
              target={<SearchTag tag={tag} />}
            ></Action.Push>
          </ActionPanel>
        }
      />
    );
  }
}
