import { prettify } from "./json";

export function listify(text: string): string {
  return prettify(JSON.stringify(text.split("\n")));
}
