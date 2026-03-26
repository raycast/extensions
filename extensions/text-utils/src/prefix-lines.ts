import { LaunchProps } from "@raycast/api";
import { transformSelection } from "./utils";

export default async function Command(props: LaunchProps<{ arguments: { prefix: string } }>) {
  const { prefix } = props.arguments;
  await transformSelection(
    (t) =>
      t
        .split("\n")
        .map((line) => prefix + line)
        .join("\n"),
    "Prefix added",
  );
}
