import { Tool } from "@raycast/api";
import { act, findScene, getState } from "../lib/client";

type Input = {
  /** Name of the scene to apply, as listed by get-status. */
  scene: string;
};

export const confirmation: Tool.Confirmation<Input> = async ({ scene }) => ({
  message: `Switch microphone and speakers to the scene "${scene}"?`,
});

export default async function tool({ scene }: Input) {
  const found = findScene((await getState()).scenes, scene);
  await act({ cmd: "applyScene", scene: found.id });
  return `Applied scene ${found.name}.`;
}
