// components/shared/EmptyView.tsx
import { List, Icon } from "@raycast/api";

export const EmptyView: React.FC = () => (
  <List.EmptyView
    title="Enter your values"
    description="Format: weight * repetitions (e.g. 70*6)"
    icon={Icon.ExclamationMark}
  />
);
