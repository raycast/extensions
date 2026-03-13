import { Tool, environment, open } from "@raycast/api";
import sound from "sound-play";

type Input = {
  /** Beats per minute */
  bpm: number;
  /** Accents pattern, e.g., 4 for a 4/4 time signature */
  accents: number;
};

/**
 * Play a metronome sound with the specified BPM and accents pattern.
 * @param input - The input object containing BPM and accents.
 */
export default async function ({ bpm, accents }: Input) {
  // Log the input for debugging
  console.log(`Received input: BPM = ${bpm}, Accents = ${accents}`);

  const interval = 60000 / bpm;
  let groupPosition = 1;

  function handleClick() {
    const soundFile = groupPosition === 1 ? "metronome-click.wav" : "metronome-click_lower.wav";
    const soundPath = `${environment.assetsPath}/sfx/${soundFile}`;

    sound.play(soundPath).catch((error) => {
      console.error(`Failed to play sound: ${soundPath}`, error);
    });

    if (groupPosition === accents) {
      groupPosition = 1;
    } else {
      groupPosition += 1;
    }
  }

  const timer = setInterval(handleClick, interval);

  // Stop the metronome after a certain duration for demonstration purposes
  setTimeout(() => clearInterval(timer), 60000); // Stop after 1 minute

  // Open the deeplink
  const deeplink = `raycast://extensions/Visual-Studio-Coder/metronome/index?arguments=${encodeURIComponent(
    JSON.stringify({ bpm: bpm.toString(), group: accents.toString() })
  )}`;
  open(deeplink).catch((error) => {
    console.error(`Failed to open deeplink: ${deeplink}`, error);
  });
}

type ConfirmationInfo = {
  name: string;
  value: string;
};

export const confirmation: Tool.Confirmation<Input> = async ({
  bpm,
  accents,
}: Input): Promise<{ title: string; info: ConfirmationInfo[] }> => {
  return {
    title: "Run Tool",
    info: [
      { name: "BPM", value: bpm.toString() },
      { name: "Accents", value: accents.toString() },
    ],
  };
};
