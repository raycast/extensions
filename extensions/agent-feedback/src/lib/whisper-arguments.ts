interface WhisperArguments {
  modelPath: string;
  audioPath: string;
  language: string;
  outputBase: string;
}

export function buildWhisperArguments({
  modelPath,
  audioPath,
  language,
  outputBase,
}: WhisperArguments): string[] {
  return [
    "-m",
    modelPath,
    "-f",
    audioPath,
    "-l",
    language,
    "-sns",
    "-ojf",
    "-of",
    outputBase,
    "-np",
  ];
}
