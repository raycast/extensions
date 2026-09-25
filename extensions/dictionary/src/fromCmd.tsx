import { LaunchProps } from "@raycast/api";
import { EntryList } from "./views";

type CommandLaunchContext = {
  selectedText?: string;
};

const Cmd = ({ launchContext }: LaunchProps<{ launchContext: CommandLaunchContext }>) => {
  return <EntryList initQuery={launchContext?.selectedText ?? ""} />;
};
export default Cmd;
