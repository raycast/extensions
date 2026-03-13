import { XcodeSimulatorList } from "./components/xcode-simulator-list/xcode-simulator-list.component";
import { XcodeInstallationVerifier } from "./components/xcode-installation-verifier/xcode-installation-verifier.component";

export default () => (
  <XcodeInstallationVerifier>
    <XcodeSimulatorList />
  </XcodeInstallationVerifier>
);
