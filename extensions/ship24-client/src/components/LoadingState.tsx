import { List, Detail } from "@raycast/api";

interface LoadingStateProps {
  title?: string;
  subtitle?: string;
  type?: "list" | "detail";
}

export function LoadingState({
  title = "Loading...",
  subtitle = "Fetching parcel data",
  type = "list",
}: LoadingStateProps) {
  if (type === "detail") {
    return <Detail isLoading={true} markdown="# Loading parcel details..." />;
  }

  return (
    <List isLoading={true}>
      <List.EmptyView title={title} description={subtitle} />
    </List>
  );
}

interface ErrorStateProps {
  title: string;
  description?: string;
  type?: "list" | "detail";
  actions?: React.ReactNode;
}

export function ErrorState({ title, description = "Please try again later", type = "list", actions }: ErrorStateProps) {
  if (type === "detail") {
    return <Detail markdown={`# ${title}\n\n${description}`} actions={actions} />;
  }

  return (
    <List>
      <List.EmptyView title={title} description={description} actions={actions} />
    </List>
  );
}
