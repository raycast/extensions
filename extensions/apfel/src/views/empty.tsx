import { Icon, List } from "@raycast/api";

export const EmptyView = () => (
  <List.EmptyView
    title="Ask anything!"
    description={"Type your question or prompt from the search bar and hit the enter key"}
    icon={Icon.QuestionMark}
  />
);
