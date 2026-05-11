import { describe, expect, it } from "vitest";
import { renderErrorMarkdown } from "./dashboardMarkdown";

describe("renderErrorMarkdown", () => {
  it("shows the error message when stderr is empty", () => {
    const markdown = renderErrorMarkdown(
      Object.assign(new Error("spawn npx ENOENT"), {
        command: "ccusage daily --json",
        stderr: "",
      }),
    );

    expect(markdown).toContain("spawn npx ENOENT");
    expect(markdown).not.toContain("No error details were returned.");
    expect(markdown).toContain("do not need to install `ccusage` or `npx`");
  });
});
