import { List, Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { sbData } from "./utils/storyblokData";
import { dateIcon } from "./utils/helpers";
import StoryDetail from "./storyDetail";

type Story = {
  name: string;
  parent_id: number | null;
  created_at: string;
  deleted_at: string | null;
  group_id: string;
  sort_by_date: string | null;
  updated_at: string;
  published_at: string | null;
  id: number;
  uuid: string;
  is_folder: boolean;
  published: boolean;
  slug: string;
  path: string | null;
  full_slug: string;
  position: number;
  is_startpage: boolean;
  pinned: boolean;
  publish_at: string | null;
  expire_at: string | null;
  first_published_at: string | null;
  default_root: string;
  disble_fe_editor: boolean;
  last_author: {
    id: number;
    userid?: string | null;
    friendly_name: string;
    avatar: string;
  };
  content_type: string;
  tag_list: string[];
  can_not_view: boolean;
  favourite_for_user_ids: number[];
};

type storiesData = {
  stories: Story[];
};

const storyMarkdown = (story: Story) => {
  return ` # ${story.name}
  | Content Type | Slug | ID |
  |---|---|---|
  | ${story.content_type} | \`${story.full_slug}\` | \`${story.id}\` | \n
  uuid: \`${story.uuid}\` \n`;
};

export default function StoriesList(props: { spaceId: number }) {
  const data = sbData<storiesData>(`spaces/${props.spaceId}/stories/`);
  if (data.isLoading) {
    return <Detail markdown={`Loading stories for space ${props.spaceId}...`} />;
  } else if (data.isLoading === false && !data.data) {
    return (
      <List>
        <List.EmptyView icon={Icon.Book} title="No Stories found." />
      </List>
    );
  } else {
    return (
      <List isLoading={data.isLoading} isShowingDetail>
        {data.data?.stories?.map((story: Story) => (
          <List.Item
            key={story.id}
            title={story.name}
            accessories={[{ text: story.content_type }]}
            detail={
              <List.Item.Detail
                markdown={storyMarkdown(story)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Last Author: "
                      text={story.last_author?.friendly_name ?? "N/A"}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Updated:"
                      icon={dateIcon(new Date(story.updated_at))}
                      text={new Date(story.updated_at).toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Last Published:"
                      icon={dateIcon(new Date(story.published_at ?? ""))}
                      text={story.published_at ? new Date(story.published_at).toString() : "Draft"}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="First Published:"
                      icon={dateIcon(new Date(story.first_published_at ?? ""))}
                      text={story.first_published_at ? new Date(story.first_published_at).toString() : "Draft"}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Created:"
                      icon={dateIcon(new Date(story.created_at))}
                      text={new Date(story.created_at).toString()}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Book}
                  title="Story Detail"
                  target={<StoryDetail spaceId={props.spaceId} storyId={story.id} />}
                />
                <Action.OpenInBrowser
                  title="Open in Storyblok"
                  url={`https://app.storyblok.com/#!/me/spaces/${props.spaceId}/stories/${story.id}/edit`}
                />
                <Action.CopyToClipboard title={`Copy Story ID: ${story.id}`} content={story.id.toString()} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }
}
