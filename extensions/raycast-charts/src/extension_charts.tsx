import { SWRConfig } from "swr";
import { cacheConfig } from "./lib/cache";
import { ExtensionChartsPerDownload } from "./components/extension_charts";

export default function ChartsRoot(): JSX.Element {
  return (
    <SWRConfig value={cacheConfig}>
      <ExtensionChartsPerDownload />
    </SWRConfig>
  );
}
