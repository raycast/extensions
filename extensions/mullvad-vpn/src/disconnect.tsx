import { execa } from "execa";

export default async function Command() {
  return execa("mullvad", ["disconnect"], { shell: true });
}
