import { Tool } from "@raycast/api";
import { calAPI, type CalUser } from "@api/cal.com";
import { confirmDestructive } from "@/lib/ai-tools";

type Input = {
  /** Display name. */
  name?: string;
  /** Cal.com username (the slug after cal.com/). */
  username?: string;
  /** Short bio. */
  bio?: string;
  /** IANA timezone, e.g. "America/Los_Angeles". */
  timeZone?: string;
  /** "Sunday" | "Monday" | ... */
  weekStart?: string;
  /** 12 or 24. */
  timeFormat?: number;
  /** BCP47, e.g. "en". */
  locale?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const changes = Object.entries(input)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join("\n");
  return confirmDestructive({
    message: `Update your Cal.com profile?\n\n${changes || "(no changes)"}`,
    image: "👤",
  });
};

export default async function tool(input: Input): Promise<CalUser> {
  return calAPI<CalUser>({ method: "PATCH", url: "/me", data: input });
}
