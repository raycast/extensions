export type ShellBuddyArguments = {
  prompt?: string;
};

export type CommandHistoryItem = {
  prompt: string;
  command: string;
};

export type KnownPrompts = {
  [prompt: string]: string;
};

export type ConversionResult = {
  success: boolean;
  title: string;
  message?: string;
  command?: string;
  remainingCredits?: number;
};

export type CheckCreditsResult = {
  success: boolean;
  title: string;
  remainingCredits: number;
};

export type CommandPreferences = {
  license: string;
};
