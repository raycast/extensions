import { transformSelection } from "./utils";

export default async function Command() {
  await transformSelection(
    (t) =>
      t
        .split("\n")
        .map((line) => line.trim())
        .join("\n"),
    "Whitespace trimmed",
  );
}
