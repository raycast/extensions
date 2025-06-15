import { LaunchProps } from "@raycast/api";
import ResultsView from "./components/ResultsView";

export default function QuickCalculateDuration(props: LaunchProps<{ arguments: Arguments.QuickCalculateDuration }>) {
  return <ResultsView {...props} />;
}
