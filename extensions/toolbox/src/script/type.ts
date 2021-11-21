export interface Category {
  title: string;
  items: Script[];
}

export interface Info {
  title: string;
  desc: string;
  type: "all" | "clipboard" | "input";
  keywords?: string[];
  example?: string;
  icon?: string;
}

export type Run = {
  (input: string): string | Error;
};

export interface Script {
  info: Info;
  run: Run;
}
