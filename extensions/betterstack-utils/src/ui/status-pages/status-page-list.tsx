import { List } from "@raycast/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useStatusPages } from "@/hooks/use-status-pages";
import { useStatusPageIcons } from "@/ui/status-pages/use-status-page-icons";
import { StatusPageListItem } from "@/ui/status-pages/components/status-page-list-item";

const queryClient = new QueryClient();

function StatusPages() {
  const { statusPages, isLoading, refresh } = useStatusPages();
  const icons = useStatusPageIcons();

  return (
    <List isLoading={isLoading}>
      {statusPages.map((statusPage) => (
        <StatusPageListItem
          key={statusPage.id}
          statusPage={statusPage}
          icon={icons[statusPage.state]}
          onRefresh={refresh}
        />
      ))}
    </List>
  );
}

export function StatusPageList() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusPages />
    </QueryClientProvider>
  );
}
