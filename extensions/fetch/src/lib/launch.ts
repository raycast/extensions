import { showError } from "@chrismessina/raycast-kit";
import { launchCommand } from "@raycast/api";

/**
 * `launchCommand` rejects when Raycast cannot open the target command. Every
 * call goes through here so that rejection reaches the user as a failure toast
 * with Copy Error, rather than vanishing as an unhandled rejection.
 */
export async function launchOrShowError(options: Parameters<typeof launchCommand>[0], title: string): Promise<void> {
  try {
    await launchCommand(options);
  } catch (error) {
    await showError(error, { title });
  }
}
