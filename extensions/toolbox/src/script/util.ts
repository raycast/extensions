import { execa } from "execa";

export async function readClipboard() {
  const { stdout } = await execa("pbpaste", ["unicorns"]);
  return stdout;
}
