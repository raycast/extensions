import { LaunchProps } from "@raycast/api";
import { CountArguments, runQuickGenerate } from "./quick-generate";

export default async function Command(props: LaunchProps<{ arguments: CountArguments }>) {
  await runQuickGenerate(props, "paragraphs", 3);
}
