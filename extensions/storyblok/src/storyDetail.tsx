import { Detail, Action, ActionPanel } from "@raycast/api";
import { sbData } from "./utils/storyblokData";
import { storyDetail } from "./utils/types";

type story = {
  story: storyDetail;
};

export default function StoryDetail(props: { spaceId: number; storyId: number }) {
  const data = sbData<story>(`spaces/${props.spaceId}/stories/${props.storyId}`);

  if (data.isLoading) {
    return <Detail markdown={`Loading Story data...`} />;
  } else {
    return (
      <Detail
        markdown={`\`\`\`json\n${JSON.stringify(data.data?.story, null, 4)}`}
        actions={
          <ActionPanel>
            {/* // todo: add open in browser action with real urls */}
            <Action.OpenInBrowser title="Open Draft JSON" url={`https://google.com`} />
            <Action.OpenInBrowser title="Open Published JSON" url={`https://google.com`} />
          </ActionPanel>
        }
      />
    );
  }
}
