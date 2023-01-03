import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MainView from "./main_view";

const queryClient = new QueryClient();
export default function NoteCards() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainView />
    </QueryClientProvider>
  );
}
