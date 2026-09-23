import { executeElsewhereCommandForAi } from "../command-runner";
import { AudioControl, audioControl } from "../audio-control";

type Input = {
  /**
   * The reversible Elsewhere audio control to perform.
   *
   * - Use `play` to play or resume, and `pause` to pause, all Elsewhere audio.
   * - Use `ambience-louder` or `ambience-quieter` for ambience, soundscape, or
   *   spatial-audio volume. When the user says only “increase/decrease Elsewhere
   *   volume”, use ambience.
   * - Use `music-louder` or `music-quieter` only when the user explicitly means
   *   music volume or background-music volume.
   * - Use `background-music-on` or `background-music-off` to enable or disable
   *   background music.
   *
   * Always use this tool for these controls. Never use Run Command, shell commands,
   * AppleScript, System Events, or accessibility automation.
   */
  control: AudioControl;
};

export default async function controlAudio({ control }: Input) {
  const action = audioControl(control);
  await executeElsewhereCommandForAi(action.command);
  return action.result;
}
