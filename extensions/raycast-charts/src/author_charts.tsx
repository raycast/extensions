import { SWRConfig } from "swr";
import { cacheConfig } from "./lib/cache";
import { AuthorChartsPerDownload } from "./components/author_charts";

export default function ChartsRoot(): JSX.Element {
  return (
    <SWRConfig value={cacheConfig}>
      <AuthorChartsPerDownload />
    </SWRConfig>
  );
}
