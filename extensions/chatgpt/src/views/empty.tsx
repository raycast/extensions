import { Icon, List } from "@raycast/api";
import { getConfiguration } from "../hooks/useChatGPT";

export const EmptyView = () => {
  const { provider } = getConfiguration();
  return (
    <List.EmptyView
      title={`Ask ${provider} anything!`}
      description={"Type your question or prompt from the search bar and hit the enter key"}
      icon={Icon.QuestionMark}
    />
  );
};
