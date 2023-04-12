import { XcodeCreateSwiftPackageForm } from "./components/xcode-create-swift-package/xcode-create-swift-package-form.component";
import { XcodeInstallationVerifier } from "./components/xcode-installation-verifier/xcode-installation-verifier.component";

export default () => (
  <XcodeInstallationVerifier>
    <XcodeCreateSwiftPackageForm />
  </XcodeInstallationVerifier>
);
