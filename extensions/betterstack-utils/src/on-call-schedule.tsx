import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ScheduleView } from "@/ui/schedule/schedule-view";

const queryClient = new QueryClient();

export default function Command() {
  return (
    <QueryClientProvider client={queryClient}>
      <ScheduleView />
    </QueryClientProvider>
  );
}
