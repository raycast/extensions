import { transformSelection } from "./utils";

export default async function Command() {
  await transformSelection(
    (t) =>
      t
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .join(" "),
    "Lines joined",
  );
}
