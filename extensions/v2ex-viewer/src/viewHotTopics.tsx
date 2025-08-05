import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import TopicDetail from "@/components/TopicDetail";
import { getUnixFromNow } from "@/utils/time";
import { NodeSelect } from "@/components/NodeSelect";
import { Topic, Response } from "@/types/v2ex";
import { getNodes, getToken } from "@/utils/preference";
import { useState } from "react";
import { showFailedToast, showLoadingToast, showSuccessfulToast } from "@/utils/toast";
export default function Command() {
  const topics = useFetch<Topic[]>(`https://www.v2ex.com/api/topics/hot.json`, {
    keepPreviousData: true,
    onWillExecute: () => {
      showLoadingToast();
    },
    onError: () => {
      showFailedToast();
    },
    onData: (data) => {
      showSuccessfulToast();
    },
  });
  const [showDetails, setShowDetails] = useState(false);
  return (
    <List isShowingDetail={showDetails} isLoading={topics.isLoading}>
      <List.Section title="Hotest" subtitle={String(topics.data?.length) || "loading"}>
        {topics.data &&
          topics.data.map((topic) => (
            <List.Item
              key={topic.id}
              icon={topic.member?.avatar_mini}
              title={topic.title}
              subtitle={{ value: !showDetails ? getUnixFromNow(topic.last_touched) : null, tooltip: "Last touched" }}
              accessories={[
                !showDetails
                  ? {
                      icon: topic.node?.avatar_mini,
                      text: topic.node?.title,
                    }
                  : {},
                {
                  tag: String(topic.replies),
                },
              ]}
              detail={<TopicDetail topic={showDetails ? topic : undefined} />}
              actions={
                <ActionPanel>
                  <Action
                    icon={showDetails ? Icon.EyeDisabled : Icon.Eye}
                    title={showDetails ? "Hide Details" : "Show Details"}
                    onAction={() => setShowDetails((x) => !x)}
                  />
                  <Action.OpenInBrowser url={topic.url} />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
