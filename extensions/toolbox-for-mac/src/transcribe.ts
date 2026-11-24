import { AUDIO, runOnFinderSelection, VIDEO } from "./lib/quick";

export default () =>
  runOnFinderSelection({
    tool: "transcribe",
    accept: [...AUDIO, ...VIDEO],
    noun: "audio or video files",
    doing: "Transcribing",
    done: "Transcribed",
    args: ["--format", "text"],
    copyText: true,
  });
