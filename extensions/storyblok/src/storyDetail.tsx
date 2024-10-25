import { Detail, Action, ActionPanel, getPreferenceValues } from "@raycast/api";
import { sbData } from "./utils/storyblokData";
import { ApiKey, storyDetail } from "./utils/types";

const preferences = getPreferenceValues<Preferences>();

type story = {
  story: storyDetail;
};

export default function StoryDetail(props: { spaceId: number; storyId: number }) {
  const { isLoading, data: apiKeysData } = sbData<{ api_keys: ApiKey[] }>(`spaces/${props.spaceId}/api_keys`);
  const apiKeys = apiKeysData?.api_keys ?? [];
  const data = sbData<story>(`spaces/${props.spaceId}/stories/${props.storyId}`);

  const storyJson = function (version: "draft" | "published", cv: string) {
    const access = version === "draft" ? "private" : "public";
    const apiKey = apiKeys.find(
      (key) => key.access === access && (!key.story_ids.length || key.story_ids.includes(props.storyId)),
    ); // empty array = all stories. else only allowed stories
    const token = apiKey?.token;
    return `${preferences.apiLocation}/v2/cdn/stories/${props.storyId}?version=${version}&token=${token}&cv=${cv}`;
  };

  if (data.isLoading || isLoading) {
    return <Detail markdown={`Loading Story data...`} />;
  } else {
    return (
      <Detail
        markdown={`\`\`\`json\n${JSON.stringify(data.data?.story, null, 4)}`}
        actions={
          <ActionPanel>
            {data.data?.story.is_folder === false && (
              <>
                <Action.OpenInBrowser
                  title="Open Draft JSON"
                  url={storyJson("draft", data.data.story.preview_token.timestamp)}
                />
                {data.data.story.published && (
                  <Action.OpenInBrowser
                    title="Open Published JSON"
                    url={storyJson("published", data.data.story.preview_token.timestamp)}
                  />
                )}
              </>
            )}
          </ActionPanel>
        }
      />
    );
  }
}
