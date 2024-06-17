import { CachedQueryClientProvider } from "./components/cached-query-client-provider/cached-query-client-provider";
import { PopiconGrid } from "./components/popicon-grid/popicon-grid";

export default function Command() {
  return (
    <CachedQueryClientProvider>
      <PopiconGrid />
    </CachedQueryClientProvider>
  );
}
