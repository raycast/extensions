import { transformSelection } from "./utils";

export default async function Command() {
  await transformSelection(
    (t) =>
      t
        .split("\n")
        .map((line) => line.replace(/^\s*\d+[.):-]\s?/, ""))
        .join("\n"),
    "Line numbers removed",
  );
}
