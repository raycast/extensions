import { inspectAudioFile } from "../audio";

type Input = {
  /** Absolute path of an audio file on the user's computer. */
  path: string;
};

/** Read the file's format, duration in seconds, sample rate, and channel count. */
export default async function inspectAudio(input: Input) {
  return inspectAudioFile(input.path);
}
