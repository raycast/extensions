import { LaunchProps } from "@raycast/api";
import { runQuickGenerate } from "./quick-generate";

export default async function Command(props: LaunchProps<{ arguments: Arguments.GenerateWords }>) {
  await runQuickGenerate(props, "words", 25);
}
