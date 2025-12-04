import { List, Icon } from "@raycast/api";

export const EmptyView: React.FC = () => (
  <List.EmptyView
    title="Enter your values"
    description="Format: weight x repetitions (e.g. 70x6)"
    icon={Icon.ExclamationMark}
  />
);
