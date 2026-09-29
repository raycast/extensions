import { launchCommand, LaunchType, Tool } from "@raycast/api";

type Input = {
  /** Lock duration in whole seconds. Use 0 for forever. Defaults to 30 seconds. */
  durationSeconds?: number;
};

const MAX_DURATION_SECONDS = 2_147_483_647;

function validateDuration(durationSeconds: number) {
  if (!Number.isInteger(durationSeconds) || durationSeconds < 0 || durationSeconds > MAX_DURATION_SECONDS) {
    throw new Error(`Choose a whole number of seconds from 1 to ${MAX_DURATION_SECONDS}, or 0 for forever.`);
  }
}

export const confirmation: Tool.Confirmation<Input> = async ({ durationSeconds = 30 }) => {
  validateDuration(durationSeconds);
  return {
    message: `Lock the keyboard for ${durationSeconds === 0 ? "forever" : `${durationSeconds} seconds`}? Press Ctrl+U to unlock at any time.`,
  };
};

/** Lock the keyboard for cleaning using a supported duration. */
export default async function tool({ durationSeconds = 30 }: Input) {
  validateDuration(durationSeconds);

  await launchCommand({ name: "clean-keyboard", type: LaunchType.UserInitiated, context: { durationSeconds } });
  return `Launched the keyboard lock command for ${durationSeconds === 0 ? "forever" : `${durationSeconds} seconds`}. Press Ctrl+U to unlock at any time.`;
}
