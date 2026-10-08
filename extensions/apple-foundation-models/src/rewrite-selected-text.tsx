import { LaunchProps } from "@raycast/api";
import { SelectedTextCommand } from "./components/SelectedTextCommand";
import { isTone } from "./lib/prompts";

export default function Command(props: LaunchProps<{ arguments: Arguments.RewriteSelectedText }>) {
  const tone = isTone(props.arguments.tone) ? props.arguments.tone : "professional";
  return <SelectedTextCommand task={{ kind: "rewrite", tone }} />;
}
