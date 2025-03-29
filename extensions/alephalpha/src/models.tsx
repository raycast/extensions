import { ActionPanel, Action, Image, List, Detail, getPreferenceValues, Icon, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { ModelSettings } from "./util/apiHelper";
import { UnauthorizedError } from "./components/UnauthorizedError";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences.apiKey;
  const apiUrl = preferences.apiUrl;

  const { data, error } = useFetch<ModelSettings[]>(`${apiUrl}/model-settings`, {
    headers: {
      Accept: "application/json",
      Authorization: "Bearer " + apiKey,
    },
  });

  const [filter, setFilter] = useState("all");
  const aleph_logo = { source: "aa_logo.png", mask: Image.Mask.Circle };
  const vllm_logo = { source: "vLLM_logo.png", mask: Image.Mask.Circle };

  if (error?.message === "Unauthorized") {
    return <UnauthorizedError />;
  } else if (error) {
    return <Detail markdown={`An error occurred while fetching the models. Please try again later.`} />;
  }

  const filteredModels =
    data?.filter((model) => {
      if (model.status !== "available") return false;
      if (filter === "all") return true;
      if (filter === "chat") return model.chat;
      if (filter === "completion") return model.semantic_embedding && !model.chat;
      if (filter === "embedding") return !model.semantic_embedding && !model.chat;
      return false;
    }) || [];

  // Function to get capability icons for detail view
  const getCapabilityIcons = (model: ModelSettings) => {
    return (
      <>
        {model.chat && <List.Item.Detail.Metadata.TagList.Item text="Chat" color={Color.Green} icon={Icon.Message} />}
        {model.aligned && (
          <List.Item.Detail.Metadata.TagList.Item text="Aligned" color={Color.Blue} icon={Icon.CheckCircle} />
        )}
        {model.multimodal && (
          <List.Item.Detail.Metadata.TagList.Item text="Multimodal" color={Color.Purple} icon={Icon.Image} />
        )}
        {model.semantic_embedding && (
          <List.Item.Detail.Metadata.TagList.Item text="Semantic" color={Color.Orange} icon={Icon.Link} />
        )}
        {!model.chat && !model.semantic_embedding && (
          <List.Item.Detail.Metadata.TagList.Item text="Embedding" color={Color.Magenta} icon={Icon.BulletPoints} />
        )}
      </>
    );
  };

  return (
    <List
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Select Model Type" storeValue={true} onChange={(newValue) => setFilter(newValue)}>
          <List.Dropdown.Section title="Model Types">
            <List.Dropdown.Item key="all" title="All Models" value="all" />
            <List.Dropdown.Item key="chat" title="Chat Models" value="chat" />
            <List.Dropdown.Item key="completion" title="Completion Models" value="completion" />
            <List.Dropdown.Item key="embedding" title="Embedding Models" value="embedding" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredModels.map((model) => (
        <List.Item
          icon={model.worker_type === "vllm" ? vllm_logo : aleph_logo}
          key={model.name}
          title={model.name}
          detail={
            <List.Item.Detail
              markdown={`**${model.name}**\n\n${model.description}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.TagList title="Capabilities">
                    {getCapabilityIcons(model)}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Max Completion Tokens" />
                  <List.Item.Detail.Metadata.Label title={model.maximum_completion_tokens.toString()} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Max Context Size" />
                  <List.Item.Detail.Metadata.Label title={model.max_context_size.toString()} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Model Name" content={model.name} />
              <Action.CopyToClipboard title="Copy Prompt Template" content={model.prompt_template} />
              <Action.CopyToClipboard title="Copy Description" content={model.description} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
