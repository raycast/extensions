import { transformSelection } from "./utils";

export default async function Command() {
  await transformSelection(
    (t) =>
      t
        .split("\n")
        .map((line, i) => `${i + 1}. ${line}`)
        .join("\n"),
    "Lines numbered",
  );
}
