import { XcodeAddSwiftPackageForm } from "./components/xcode-add-swift-package/xcode-add-swift-package-form.component";
import { XcodeInstallationVerifier } from "./components/xcode-installation-verifier/xcode-installation-verifier.component";

export default () => (
  <XcodeInstallationVerifier>
    <XcodeAddSwiftPackageForm />
  </XcodeInstallationVerifier>
);
