import { homedir } from "node:os";
import { join } from "node:path";

/** A folder offered without typing its path. */
export interface Place {
  title: string;
  path: string;
}

/** The folders Sizewise's empty window offers, in the same order. */
export function places(home: string = homedir()): Place[] {
  return [
    { title: "Home", path: home },
    { title: "Applications", path: "/Applications" },
    { title: "Downloads", path: join(home, "Downloads") },
  ];
}
