import { LaunchProps } from "@raycast/api";
import { TEXT_SCHEMA, TONES, toneSystem } from "./lib/prompts";
import { runQuickTask } from "./lib/quick";

export default async function Command(props: LaunchProps<{ arguments: Arguments.ChangeTone }>) {
  const tone = TONES.find((t) => t.id === props.arguments.tone) ?? TONES[0];
  await runQuickTask<{ text: string }>({
    command: "change-tone",
    title: `Tone: ${tone.title}`,
    progress: `Changing tone to ${tone.title}…`,
    system: toneSystem(tone.prompt),
    schema: TEXT_SCHEMA,
    done: () => `✓ Tone: ${tone.title}`,
  });
}
