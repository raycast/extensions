// @ts-nocheck - Raycast internal React types conflict with @types/react v18
import { LaunchProps } from "@raycast/api";
import ResultList from "./components/ResultList";

interface LaunchContext {
  url?: string;
}

/**
 * Pure format picker command — receives a URL via launchContext
 * and shows Markdown / URL / HTML / Open in Browser options.
 */
export default function Command(
  props: LaunchProps<{ launchContext?: LaunchContext }>,
) {
  const url = props.launchContext?.url || "";

  if (!url) {
    return <ResultList url="" />;
  }

  return <ResultList url={url} />;
}
