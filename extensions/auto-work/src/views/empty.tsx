import { Icon, List } from '@raycast/api';
interface EmptyViewType {
  title: string;
}

export const EmptyView = ({ title }: EmptyViewType) => (
  <List.EmptyView
    title={title}
    description={'Type your question or prompt from the search bar and hit the enter key'}
    icon={Icon.QuestionMark}
  />
);
