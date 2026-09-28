import { launchCommand, LaunchType, Tool } from "@raycast/api";

type Input = {
  /** Lock duration in seconds: 15, 30, 60, 120, 300, 3600, or 86400. Use 0 for forever. Defaults to 30 seconds. */
  durationSeconds?: number;
};

const validDurations = [0, 15, 30, 60, 120, 300, 3600, 86400];

function validateDuration(durationSeconds: number) {
  if (!validDurations.includes(durationSeconds)) {
    throw new Error("Choose 15, 30, 60, 120, 300, 3600, or 86400 seconds, or 0 for forever.");
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
