import { LaunchProps } from "@raycast/api";
import { runQuickGenerate } from "./quick-generate";

export default async function Command(props: LaunchProps<{ arguments: Arguments.GenerateParagraphs }>) {
  await runQuickGenerate(props, "paragraphs", 3);
}
