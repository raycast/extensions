import TimeEntriesListView from "@/components/TimeEntriesListView";
import { ExtensionContextProvider } from "@/context/ExtensionContext";

export default function Command() {
  return (
    <ExtensionContextProvider>
      <TimeEntriesListView />
    </ExtensionContextProvider>
  );
}
