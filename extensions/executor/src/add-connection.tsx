import { withWorkspace, type CommandLaunchContext } from "./components/workspace-command";
import { ConnectionSetupForm } from "./components/connection-setup-form";

function AddConnection({ launchContext }: { launchContext?: CommandLaunchContext }) {
  return <ConnectionSetupForm defaults={launchContext} />;
}

export default withWorkspace(AddConnection);
