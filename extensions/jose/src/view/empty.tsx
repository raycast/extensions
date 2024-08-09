import { Icon, List } from "@raycast/api";

export const EmptyView = () => (
  <List.EmptyView
    title="Ask anything!"
    description={"Type your question from the search bar"}
    icon={Icon.QuestionMark}
  />
);
