import { Clipboard, Detail, getSelectedText, type LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import RenderView from "./components/RenderView";
import SourceForm from "./components/SourceForm";
import { detectSource, type ChartSource } from "./lib/render/source";

interface RenderContext {
  /** Mermaid or an ECharts option handed over by a deeplink or another command. */
  source?: string;
}

/** Launch context first, then whatever is selected, then the clipboard. Nothing recognized means the form. */
async function findSource(context?: RenderContext): Promise<ChartSource | undefined> {
  const fromContext = detectSource(context?.source);
  if (fromContext) return fromContext;
  const selected = await getSelectedText().catch(() => undefined);
  const fromSelection = detectSource(selected);
  if (fromSelection) return fromSelection;
  const clipboard = await Clipboard.readText().catch(() => undefined);
  return detectSource(clipboard);
}

export default function RenderChart(props: LaunchProps<{ launchContext?: RenderContext }>) {
  const { data, isLoading } = usePromise(findSource, [props.launchContext]);

  if (isLoading) return <Detail isLoading />;
  if (data) return <RenderView source={data} />;
  return <SourceForm />;
}
