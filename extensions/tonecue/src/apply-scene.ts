import { LaunchProps } from "@raycast/api";
import { act, findScene, getState } from "./lib/client";
import { runCommand } from "./lib/ui";

export default async function Command(props: LaunchProps<{ arguments: Arguments.ApplyScene }>) {
  await runCommand(async () => {
    const scene = findScene((await getState()).scenes, props.arguments.scene);
    await act({ cmd: "applyScene", scene: scene.id });
    return `Scene: ${scene.name}`;
  });
}
