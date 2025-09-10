import { Icon, List } from "@raycast/api";
import { messages } from "@/locale/en/messages";

interface EmptyStateProps {
  isLoading?: boolean;
}

export default function EmptyState({ isLoading = false }: EmptyStateProps) {
  if (isLoading) {
    return <List.EmptyView icon={Icon.Stars} title={messages.toast.generatingSingleVariant} />;
  }

  return <List.EmptyView icon={Icon.Document} title={messages.emptyState.title} />;
}
