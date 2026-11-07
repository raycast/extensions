import { open } from "@raycast/api";

export default async function main() {
  await open(
    "https://app.revamp.dev/?utm_source=raycast&utm_medium=integration&utm_campaign=revamp_extension",
  );
}
