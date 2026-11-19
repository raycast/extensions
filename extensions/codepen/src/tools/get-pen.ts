import { getClient } from "../lib/api";
type Input = { /** Pen ID returned by Search Pens. */ penId: string };
/**
 * If the user provides a Pen ID, read it directly with this tool.
 * Read before editing or forking. Classic Pens are read-only. A Protected fork needs a
 * new user-provided password before fork-pen can be called.
 */
export default function tool({ penId }: Input) {
  return getClient().snapshot(penId);
}
