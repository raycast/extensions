import { List, Icon } from "@raycast/api";

const Empty = () => (
  <List.EmptyView
    title="Type your requirements!"
    description={"Type your requirements and hit the enter key\n⌘+P to change language."}
    icon={Icon.QuestionMark}
  />
);

export default Empty;
