import { LaunchProps } from "@raycast/api";
import { instructionSystem, TEXT_SCHEMA } from "./lib/prompts";
import { runQuickTask } from "./lib/quick";
import { oneLine } from "./lib/text";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Transform }>) {
  const instruction = props.arguments.instruction.trim();
  await runQuickTask<{ text: string }>({
    command: "transform",
    title: oneLine(instruction, 60),
    progress: "Applying…",
    system: instructionSystem(instruction),
    schema: TEXT_SCHEMA,
    done: () => "✓ Done",
  });
}
