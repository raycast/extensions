import { Icon, List } from "@raycast/api";

export const EmptyView = () => (
  <List.EmptyView
    title="Type anything!"
    description={
      "Type your text and hit the enter key\n⌘+P to change language. Using *Switch to Translate ...* to switch from/to."
    }
    icon={Icon.QuestionMark}
  />
);
