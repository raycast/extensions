// =============================================================================
// BETTERDISPLAY BACKEND
// A SidecarBackend implemented over the `betterdisplaycli` binary.
// -----------------------------------------------------------------------------
// Context: Every call shells out to BetterDisplay, which must be running. The
//   low-level invocation and identifier parsing live in betterdisplaycli.ts.
// WARN: Never issues a `--main` write, and never disconnects a display.
//   Mirroring always targets the existing main display as the master.
// =============================================================================

import { SidecarError } from "./backend";
import { parseMainDisplay, readCli, writeCli } from "./betterdisplaycli";

import type { SidecarBackend, SidecarDevice } from "./backend";
import type { Device } from "./betterdisplaycli";

/**
 * Reads the display macOS currently treats as main.
 *
 * @param cliPath - Path to the CLI binary.
 * @returns The main display, or null when BetterDisplay reports none.
 */
async function readMainDisplay(cliPath: string): Promise<Device | null> {
  return parseMainDisplay(await readCli(cliPath, ["get", "--displayWithMainStatus", "--identifiers"]));
}

/**
 * Builds a SidecarBackend backed by `betterdisplaycli`.
 *
 * @param cliPath - Path to the `betterdisplaycli` binary.
 * @returns The BetterDisplay engine.
 */
export function createBetterDisplayBackend(cliPath: string): SidecarBackend {
  return {
    async listDevices(): Promise<readonly SidecarDevice[]> {
      const raw = await readCli(cliPath, ["get", "--sidecarList"]);
      if (raw === null || raw === "") {
        return [];
      }
      return raw
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "")
        .flatMap((line) => {
          // Names may contain commas, so split on the final separator only.
          const cut = line.lastIndexOf(", ");
          return cut === -1 ? [] : [{ name: line.slice(0, cut).trim(), uuid: line.slice(cut + 2).trim() }];
        });
    },

    async isConnected(ipadName: string): Promise<boolean> {
      return (await readCli(cliPath, ["get", "--sidecarConnected", `--specifier=${ipadName}`])) === "on";
    },

    async setConnected(ipadName: string, connected: boolean): Promise<void> {
      await writeCli(cliPath, ["set", `--sidecarConnected=${connected ? "on" : "off"}`, `--specifier=${ipadName}`]);
    },

    async readMirror(ipadName: string): Promise<boolean | null> {
      const raw = await readCli(cliPath, ["get", `--name=${ipadName}`, "--mirror"]);
      return raw === null ? null : raw === "on";
    },

    async isIpadMain(ipadName: string): Promise<boolean> {
      const main = await readMainDisplay(cliPath);
      return main !== null && main.name === ipadName;
    },

    async extend(ipadName: string): Promise<void> {
      await writeCli(cliPath, ["set", `--name=${ipadName}`, "--mirror=off"]);
    },

    async mirrorToMain(ipadName: string): Promise<void> {
      const main = await readMainDisplay(cliPath);
      if (main === null) {
        throw new SidecarError("BetterDisplay reports no main display; refusing to mirror.");
      }
      if (main.name === ipadName) {
        throw new SidecarError("The iPad is currently the main display; refusing to mirror onto it.");
      }
      await writeCli(cliPath, ["set", `--UUID=${main.uuid}`, "--mirror=on", `--targetName=${ipadName}`]);
    },
  };
}
