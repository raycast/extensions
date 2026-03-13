import { XcodeInstallationVerifier } from "./components/xcode-installation-verifier/xcode-installation-verifier.component";
import { XcodeRuntimeList } from "./components/xcode-runtime-list/xcode-runtime-list.component";

export default () => (
  <XcodeInstallationVerifier>
    <XcodeRuntimeList />
  </XcodeInstallationVerifier>
);
