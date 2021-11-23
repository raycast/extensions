export type RunType = "all" | "clipboard" | "noclipboard" | "direct" | "form";

export interface Category {
  title: string;
  items: Script[];
}

export interface Run {
  (input: string): string | Error;
}

export interface Result {
  query: string;
  result: string;
  isLoading: boolean;
  isWaiting: boolean;
  isError: boolean;
}

export interface Info {
  title: string;
  desc: string;
  type: RunType;
  keywords?: string[];
  example?: string;
  icon?: string;
}

export interface Script {
  info: Info;
  run: Run;
}
