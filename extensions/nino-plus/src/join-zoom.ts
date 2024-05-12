import { open } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";

export default async function main() {
  const password = getPreferenceValues().password?.value;

  await open("https://us06web.zoom.us/j/83310204869" + (password ? `?pwd=${password}` : ""));
}
