import { describe, expect, it } from "vitest";
import { ARGUMENT_PLACEHOLDER, quicklinkWithArgument } from "./quicklink";

const COMMAND = "raycast://extensions/me/quickadd/run-choice";

/** What Raycast does when the Quicklink runs with `text` as its argument. */
function fill(link: string, text: string): string {
  return link.replace(
    ARGUMENT_PLACEHOLDER,
    encodeURIComponent(JSON.stringify(text)),
  );
}

function launchContext(link: string): unknown {
  const context = new URL(link).searchParams.get("context");
  return JSON.parse(context ?? "");
}

describe("quicklinkWithArgument", () => {
  const context = { vaultPath: "/Users/me/my notes", choiceId: "a&b#c" };

  it("hands the argument to the command as the context's value", () => {
    const text = `idea & plan #tag [[Note]] "quoted" back\\slash æøå 💡`;
    const link = fill(quicklinkWithArgument(COMMAND, context), text);
    expect(link.startsWith(`${COMMAND}?context=`)).toBe(true);
    expect(launchContext(link)).toEqual({ ...context, value: text });
  });
});
