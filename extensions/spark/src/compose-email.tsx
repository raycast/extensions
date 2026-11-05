import { LaunchProps } from "@raycast/api";
import ComposeForm, { ComposeValues } from "./components/ComposeForm";
import { withSparkCLI } from "./components/SparkSetup";

function Command(props: LaunchProps<{ draftValues: ComposeValues }>) {
  return <ComposeForm enableDrafts draftValues={props.draftValues} />;
}

export default withSparkCLI(Command);
