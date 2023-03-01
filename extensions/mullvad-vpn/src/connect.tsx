import { execa } from "execa";

export default async function Command() {
  return execa("mullvad", ["connect"], { shell: true });
}
