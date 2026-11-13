import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultPreferences, mocks } from "../../test/raycast-api";
import { observeCommands, runMise } from "../mise/exec";
import * as version from "../mise/version";
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

  it("reads the mise version on every call, so an in-place upgrade is picked up", async () => {
    const readVersion = vi
      .spyOn(version, "readVersion")
      .mockResolvedValueOnce({ version: "2026.10.6" })
      .mockResolvedValueOnce({ version: "2026.11.0", latest: "2026.11.0" });
    expect(await resolveMiseFromRaycast()).toMatchObject({ path: "/bin/sh", version: { version: "2026.10.6" } });
    expect(await resolveMiseFromRaycast()).toMatchObject({ version: { version: "2026.11.0", latest: "2026.11.0" } });
    expect(readVersion).toHaveBeenCalledTimes(2);
  });
});
