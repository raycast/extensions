import { execa } from "execa";

export async function readClipboard() {
  const { stdout } = await execa("pbpaste");
  return stdout;
}
