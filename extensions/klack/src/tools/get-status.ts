import { getState } from "../lib/state";
import type { KlackState } from "../lib/types";

export default function tool(): Promise<KlackState> {
  return getState();
}
