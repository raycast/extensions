import { pondClient } from "../api";

type Input = {
  /** Exact path returned by List Libraries. Do not invent a path or pick an ambiguous name. */
  path: string;
};

export default async function SwitchLibrary({ path }: Input) {
  return pondClient().selectLibrary(path);
}

export function confirmation({ path }: Input) {
  return {
    info: [
      { name: "Switch to Library", value: path },
      { name: "Effect", value: "Subsequent searches and saves will use this library." },
    ],
  };
}
