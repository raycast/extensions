import { withWorkspace, type CommandLaunchContext } from "./components/workspace-command";
import { ConnectionSetupForm } from "./components/connection-setup-form";

function AddConnection({ launchContext }: { launchContext?: CommandLaunchContext }) {
  return <ConnectionSetupForm defaults={launchContext} isRootView />;
}

export default withWorkspace(AddConnection);
