import { transformSelection } from "./utils";

export default async function Command() {
  await transformSelection(
    (t) =>
      t
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .join("\n"),
    "Empty lines removed",
  );
}
