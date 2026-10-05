import { Detail } from "@raycast/api";
import { Choice } from "./types";

/** Shown instead of a form or a spinner when basic mode can't run a choice. */
export default function BlockedView({ choice, reason }: { choice: Choice; reason: string }) {
  return <Detail navigationTitle={choice.title} markdown={`# Can't run “${choice.name}” in basic mode\n\n${reason}`} />;
}
