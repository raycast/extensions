import { render } from "@raycast/api";
import { DeviceList } from "./helpers";

export default async function main() {
  render(<DeviceList type="output" />);
}
