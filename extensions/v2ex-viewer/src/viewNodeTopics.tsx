import { Action, ActionPanel, Icon, List, Cache } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import TopicDetail from "@/components/TopicDetail";
import { getUnixFromNow } from "@/utils/time";
import { NodeSelect } from "@/components/NodeSelect";
import { Topic, Response } from "@/types/v2ex";
import { getNodes, getToken } from "@/utils/preference";
import { useState } from "react";
import { showFailedToast, showLoadingToast, showSuccessfulToast } from "@/utils/toast";
export default function Command() {
  const token = getToken();
  const nodes = getNodes();
  const [node, setNode] = useState<string>();
  const topics = useFetch<Response<Topic[]>>(`https://www.v2ex.com/api/v2/nodes/${node}/topics`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    execute: !!node && !!token,
    keepPreviousData: true,
    onWillExecute: () => {
      showLoadingToast({ message: `/nodes/${node}/topics` });
    },
    onError: (error) => {
      showFailedToast({ message: error.message || "" });
    },
    onData: (data) => {
      showSuccessfulToast({ message: data.message || "" });
    },
  });
  const [showDetails, setShowDetails] = useState(false);

  return (
    <List
      isShowingDetail={showDetails}
      searchBarAccessory={
        <NodeSelect
          nodes={nodes}
          onNodeChange={(node) => {
            setNode(node);
          }}
        />
      }
      isLoading={topics.isLoading}
    >
      {topics.data?.result &&
        topics.data.result.map((topic) => (
          <List.Item
            key={topic.id}
            title={topic.title}
            subtitle={{ value: !showDetails ? getUnixFromNow(topic.last_touched) : null, tooltip: "Last touched" }}
            accessories={[{ tag: String(topic.replies), tooltip: "Replies" }]}
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
    </List>
  );
}
