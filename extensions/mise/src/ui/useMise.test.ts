import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultPreferences, mocks } from "../../test/raycast-api";
import { observeCommands, runMise } from "../mise/exec";
import { resolveMiseFromRaycast } from "./useMise";

describe("resolveMiseFromRaycast", () => {
  afterEach(() => observeCommands(undefined));

  it("logs every mise command line, exit code and duration only while debugLogging is on", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    mocks.getPreferenceValues.mockReturnValue({ ...defaultPreferences, debugLogging: true });
    const mise = await resolveMiseFromRaycast();
    if (!("path" in mise)) throw new Error("expected /bin/sh to resolve");
    await runMise(mise, ["-c", "exit 4"]);
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/^mise -c exit 4 → exit 4 in \d+ms$/));

    mocks.getPreferenceValues.mockReturnValue({ ...defaultPreferences });
    await resolveMiseFromRaycast();
    await runMise(mise, ["-c", "exit 0"]);
    expect(log).toHaveBeenCalledOnce();
  });
});
