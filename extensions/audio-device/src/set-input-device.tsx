import { render } from "@raycast/api";
import { isSwitchAudioInstalled, DependenciesNotMet, DeviceList } from "./helpers";

export default async function main() {
  if (isSwitchAudioInstalled()) {
    render(<DeviceList type="input" />);
  } else {
    render(<DependenciesNotMet />);
  }
}
