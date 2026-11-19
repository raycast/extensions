import { InstallationGate } from "./installation";

// Setup offers explicit install/removal; search and management also install on first launch.
export default function Setup() {
  return <InstallationGate />;
}
