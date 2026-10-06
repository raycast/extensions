export interface ScheduleLaunchInput {
  arguments?: {
    sentence?: string;
  };
  fallbackText?: string;
}

export function resolveInitialSentence(input: ScheduleLaunchInput): string {
  const argument = input.arguments?.sentence;
  if (typeof argument === "string" && argument.trim()) {
    return argument;
  }

  return typeof input.fallbackText === "string" && input.fallbackText.trim() ? input.fallbackText : "";
}
