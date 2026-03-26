import { LaunchProps } from "@raycast/api";
import { transformSelection } from "./utils";

export default async function Command(props: LaunchProps<{ arguments: { suffix: string } }>) {
  const { suffix } = props.arguments;
  await transformSelection(
    (t) =>
      t
        .split("\n")
        .map((line) => line + suffix)
        .join("\n"),
    "Suffix added",
  );
}
