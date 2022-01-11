export type Transformer = (input: string) => string | Promise<string>;

export interface Stats {
  accessCounts: { [name: string]: number };
  accessTimes: { [name: string]: number | null };
  increment: (scriptName: string) => void;
  clear: (scriptName?: string) => void;
}

export interface Util {
  name: string;
  inputType: "textfield" | "textarea";
  icon: string;
  description: string;
  transform: Transformer;
}
