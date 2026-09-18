import { XcodeSimulator } from "../models/xcode-simulator/xcode-simulator.model";
import { execAsync } from "../shared/exec-async";
import { XcodeSimulatorGroup } from "../models/xcode-simulator/xcode-simulator-group.model";
import { XcodeSimulatorState } from "../models/xcode-simulator/xcode-simulator-state.model";
import { XcodeSimulatorAppAction } from "../models/xcode-simulator/xcode-simulator-app-action.model";
import { XcodeSimulatorAppPrivacyAction } from "../models/xcode-simulator/xcode-simulator-app-privacy-action.model";
import { XcodeSimulatorAppPrivacyServiceType } from "../models/xcode-simulator/xcode-simulator-app-privacy-service-type.model";
import { groupBy } from "../shared/group-by";
import { XcodeService } from "./xcode.service";
import {
  XcodeSimulatorOpenUrlError,
  XcodeSimulatorOpenUrlErrorReason,
} from "../models/xcode-simulator/xcode-simulator-open-url-error.model";
import { XcodeSimulatorStateFilter } from "../models/xcode-simulator/xcode-simulator-state-filter.model";
import { LocalStorage } from "@raycast/api";

/**
 * LocalStorage key for the recent simulators history.
 */
const RECENT_SIMULATORS_KEY = "xcode_recent_simulators_v1";

/**
 * XcodeSimulatorService
 */
export class XcodeSimulatorService {
  /**
   * Cached boolean for devicectl availability
   */
  private static _isDevicectlAvailable: boolean | undefined;

  /**
   * Check if `devicectl` is available (Xcode 27+ / Device Hub).
   * Uses a cached value to avoid repeated checks.
   */
  static async isDevicectlAvailable(): Promise<boolean> {
    if (this._isDevicectlAvailable !== undefined) {
      return this._isDevicectlAvailable;
    }
    try {
      await execAsync("xcrun devicectl --version");
      this._isDevicectlAvailable = true;
    } catch {
      this._isDevicectlAvailable = false;
    }
    return this._isDevicectlAvailable;
  }

  /**
   * Launches the simulator GUI application.
   * On Xcode 27+, tries to open Device Hub first, then falls back to Simulator.app.
   */
  static async launchSimulatorApplication(): Promise<void> {
    const isDevicectl = await XcodeSimulatorService.isDevicectlAvailable();
    if (isDevicectl) {
      try {
        // Device Hub (Xcode 27+) — try by bundle id, fall back to app name
        await execAsync(`open -b "com.apple.dt.DeviceHub"`);
        return;
      } catch {
        try {
          await execAsync(`open -a "Device Hub"`);
          return;
        } catch {
          // Fall through to legacy Simulator.app
        }
      }
    }
    // Legacy: open Simulator.app (pre-Xcode 27)
    return execAsync(`open -b "com.apple.iphonesimulator"`).then();
  }

  /**
   * Retrieve all XcodeSimulatorGroups
   *
   * @param filter The XcodeSimulatorStateFilter to filter the XcodeSimulatorGroups
   */
  static async xcodeSimulatorGroups(filter: XcodeSimulatorStateFilter): Promise<XcodeSimulatorGroup[]> {
    const simulators = await XcodeSimulatorService.xcodeSimulators();
    const history = await XcodeSimulatorService.getRecentSimulatorHistory();

    // Attach lastUsed timestamp to each simulator
    for (const sim of simulators) {
      sim.lastUsed = history[sim.udid] ?? 0;
    }

    return groupBy(
      simulators.filter(
        (value) =>
          filter === XcodeSimulatorStateFilter.all || value.state === (filter as unknown as XcodeSimulatorState)
      ),
      (simulator) => simulator.runtime
    )
      .map((group) => {
        return { runtime: group.key, simulators: group.values };
      })
      .sort((lhs, rhs) => rhs.runtime.localeCompare(lhs.runtime));
  }

  /**
   * Retrieve all installed XcodeSimulators
   */
  static async xcodeSimulators(): Promise<XcodeSimulator[]> {
    // Execute command
    const output = await execAsync("xcrun simctl list -j -v devices");
    // Parse stdout as JSON
    const devicesResponseJSON = JSON.parse(output.stdout);
    // Check if JSON or devices within the JSON are not available
    if (!devicesResponseJSON || !devicesResponseJSON.devices) {
      // Return empty simulators array
      throw [];
    }
    // Initialize XcodeSimulators
    const simulators: XcodeSimulator[] = [];
    // For each DeviceGroup
    for (const deviceGroup in devicesResponseJSON.devices) {
      // Initialize runtime components from DeviceGroup
      const runtimeComponents = deviceGroup.substring(deviceGroup.lastIndexOf(".") + 1).split("-");
      // Initialize runtime string
      const runtime = [runtimeComponents.shift(), runtimeComponents.join(".")].join(" ");
      // Push Simulators in DeviceGroup
      simulators.push(
        ...devicesResponseJSON.devices[deviceGroup].map((simulator: XcodeSimulator) => {
          simulator.runtime = runtime;
          return simulator;
        })
      );
    }
    // Return XcodeSimulators
    return simulators;
  }

  /**
   * Boot XcodeSimulator
   * @param xcodeSimulatorUDID The XcodeSimulator UDID to boot
   */
  static boot(xcodeSimulatorUDID: string): Promise<void> {
    return execAsync(`xcrun simctl boot ${xcodeSimulatorUDID}`).then(() => {
      // Track usage for recent history
      XcodeSimulatorService.trackSimulatorUsage(xcodeSimulatorUDID);
      // Silently launch Simulator application
      XcodeSimulatorService.launchSimulatorApplication();
    });
  }

  /**
   * Shutdown XcodeSimulator
   * @param xcodeSimulatorUDID The XcodeSimulator UDID to shutdown
   */
  static shutdown(xcodeSimulatorUDID: string): Promise<void> {
    // Shutdown Simulator
    return execAsync(`xcrun simctl shutdown ${xcodeSimulatorUDID}`).then();
  }

  /**
   * Toggle XcodeSimulator
   */
  static toggle(xcodeSimulator: XcodeSimulator): Promise<void> {
    switch (xcodeSimulator.state) {
      case XcodeSimulatorState.booted:
        return XcodeSimulatorService.shutdown(xcodeSimulator.udid);
      case XcodeSimulatorState.shuttingDown:
        return Promise.resolve();
      case XcodeSimulatorState.shutdown:
        return XcodeSimulatorService.boot(xcodeSimulator.udid);
    }
  }

  /**
   * Restart XcodeSimulator
   * @param xcodeSimulatorUDID The XcodeSimulator udid to restart
   */
  static async restart(xcodeSimulatorUDID: string): Promise<void> {
    await XcodeSimulatorService.shutdown(xcodeSimulatorUDID);
    await XcodeSimulatorService.boot(xcodeSimulatorUDID);
  }

  /**
   * Perform a XcodeSimulator AppAction
   * @param action The XcodeSimulatorAppAction
   * @param bundleIdentifier The bundle identifier of the application
   * @param xcodeSimulator The XcodeSimulator
   */
  static async app(
    action: XcodeSimulatorAppAction,
    bundleIdentifier: string,
    xcodeSimulator: XcodeSimulator
  ): Promise<void> {
    try {
      // Boot Xcode Simulator and ignore any errors
      await XcodeSimulatorService.boot(xcodeSimulator.udid);
      // eslint-disable-next-line no-empty
    } catch {}
    // Launch application by bundle identifier
    return execAsync(["xcrun", "simctl", action, xcodeSimulator.udid, bundleIdentifier].join(" ")).then();
  }

  /**
   * Perform a XcodeSimulator AppPrivacyAction for a given AppPrivacyServiceType
   * @param action The XcodeSimulatorAppPrivacyAction
   * @param serviceType The XcodeSimulatorAppPrivacyServiceType
   * @param bundleIdentifier The bundle identifier of the application
   * @param xcodeSimulator The XcodeSimulator
   */
  static async appPrivacy(
    action: XcodeSimulatorAppPrivacyAction,
    serviceType: XcodeSimulatorAppPrivacyServiceType,
    bundleIdentifier: string,
    xcodeSimulator: XcodeSimulator
  ): Promise<void> {
    try {
      // Boot Xcode Simulator and ignore any errors
      await XcodeSimulatorService.boot(xcodeSimulator.udid);
      // eslint-disable-next-line no-empty
    } catch {}
    return execAsync(
      ["xcrun", "simctl", "privacy", xcodeSimulator.udid, action, serviceType, bundleIdentifier].join(" ")
    ).then();
  }

  /**
   * Bool value if a given url is valid to be opened in a simulator
   * @param url The url to validate.
   */
  static isValidUrl(url: string): boolean {
    return /\w+:\/\/+/.test(url);
  }

  /**
   * Opens a URL in a Simulator
   * @param url The url which should be opened
   * @param simulatorUDID The optional simulator udid where the url should be opened.
   */
  static async openUrl(url: string, simulatorUDID?: string) {
    // Trim url
    const trimmedUrl = url.trim();
    // Check if the url has a valid scheme e.g. (maps://, https://raycast.com)
    if (!XcodeSimulatorService.isValidUrl(trimmedUrl)) {
      throw new XcodeSimulatorOpenUrlError(XcodeSimulatorOpenUrlErrorReason.badUrl);
    }
    // Check if no simulator udid is presented
    if (!simulatorUDID) {
      // Check if Xcode is not installed
      if (!(await XcodeService.isXcodeInstalled())) {
        // Throw error
        throw new XcodeSimulatorOpenUrlError(XcodeSimulatorOpenUrlErrorReason.xcodeInstallationMissing);
      }
      // Retrieve all simulators
      const simulators = await XcodeSimulatorService.xcodeSimulators();
      // Check if at least one simulator is booted
      if (!simulators.some((xcodeSimulator) => xcodeSimulator.state === XcodeSimulatorState.booted)) {
        // Otherwise throw an error
        throw new XcodeSimulatorOpenUrlError(XcodeSimulatorOpenUrlErrorReason.bootedSimulatorMissing);
      }
    }
    // Open URL in simulator
    return execAsync(["xcrun", "simctl", "openurl", simulatorUDID ?? "booted", `"${trimmedUrl}"`].join(" ")).then(
      () => {
        // Silently launch Simulator application
        XcodeSimulatorService.launchSimulatorApplication();
      }
    );
  }

  /**
   * Sends a push notification to a Xcode Simulator
   * @param xcodeSimulator The Xcode Simulator
   * @param bundleIdentifier The bundle identifier of the app
   * @param payloadPath The path of the push notification payload
   */
  static async sendPushNotification(
    xcodeSimulator: XcodeSimulator,
    bundleIdentifier: string,
    payloadPath: string
  ): Promise<void> {
    return execAsync(`xcrun simctl push ${xcodeSimulator.udid} ${bundleIdentifier} ${payloadPath}`).then();
  }

  /**
   * Deletes App Files without uninstalling the app
   * @param containerPath App Container Directory
   * @param appGroupPath App Group Directory
   */
  static async deleteAppFiles(containerPath: string, appGroupPath?: string): Promise<void> {
    const deleteAppGroupPathPromise = appGroupPath ? execAsync(`rm -rf ${appGroupPath}`) : Promise.resolve();
    return Promise.all([execAsync(`rm -rf ${containerPath}`), deleteAppGroupPathPromise]).then();
  }

  /**
   * Rename XcodeSimulator
   * @param xcodeSimulator The Xcode Simulator to rename
   * @param name The new simulator name
   */
  static async rename(xcodeSimulator: XcodeSimulator, name: string): Promise<void> {
    return execAsync(`xcrun simctl rename ${xcodeSimulator.udid} '${name}' `).then();
  }

  /**
   * Deletes a XcodeSimulator
   * @param xcodeSimulator The Xcode Simulator to delete
   */
  static async delete(xcodeSimulator: XcodeSimulator): Promise<void> {
    return execAsync(`xcrun simctl delete ${xcodeSimulator.udid}`).then();
  }

  /**
   * Trigger iCloud Sync for XcodeSimulator
   * @param xcodeSimulator The Xcode Simulator to trigger iCloud Sync to
   */
  static async triggerIcloudSync(xcodeSimulator: XcodeSimulator): Promise<void> {
    return execAsync(`xcrun simctl icloud_sync ${xcodeSimulator.udid}`).then();
  }

  /**
   * Retrieve the recent simulator history from LocalStorage.
   * @returns A map of simulator UDID to last-used timestamp.
   */
  static async getRecentSimulatorHistory(): Promise<Record<string, number>> {
    try {
      const raw = await LocalStorage.getItem<string>(RECENT_SIMULATORS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  /**
   * Track usage of a simulator by updating its last-used timestamp in LocalStorage.
   * @param udid The UDID of the simulator to track.
   */
  static async trackSimulatorUsage(udid: string): Promise<void> {
    try {
      const history = await XcodeSimulatorService.getRecentSimulatorHistory();
      history[udid] = Date.now();
      await LocalStorage.setItem(RECENT_SIMULATORS_KEY, JSON.stringify(history));
    } catch {
      // Silently ignore tracking errors
    }
  }

  /**
   * Toggle the appearance (Dark/Light mode) of a booted Xcode Simulator.
   * Uses `devicectl` on Xcode 27+ (Device Hub), falls back to `simctl` on older versions.
   * @param xcodeSimulator The booted Xcode Simulator
   * @returns The new appearance ("dark" or "light")
   */
  static async toggleAppearance(xcodeSimulator: XcodeSimulator): Promise<"dark" | "light"> {
    const isDevicectl = await XcodeSimulatorService.isDevicectlAvailable();

    if (isDevicectl) {
      try {
        // devicectl doesn't have a "get current appearance" command,
        // so we toggle by trying to set dark, then light if already dark.
        // Use simctl to read current state, then devicectl to set.
        const { stdout } = await execAsync(`xcrun simctl ui ${xcodeSimulator.udid} appearance`);
        const currentIsDark = stdout.trim().toLowerCase().includes("dark");
        const newMode = currentIsDark ? "light" : "dark";
        await execAsync(
          `xcrun devicectl device settings appearance --device ${xcodeSimulator.udid} --mode ${newMode}`
        );
        await XcodeSimulatorService.trackSimulatorUsage(xcodeSimulator.udid);
        return newMode;
      } catch {
        // Fallback to simctl if devicectl fails
      }
    }

    // Legacy: simctl only
    const { stdout } = await execAsync(`xcrun simctl ui ${xcodeSimulator.udid} appearance`);
    const currentIsDark = stdout.trim().toLowerCase().includes("dark");
    const newMode = currentIsDark ? "light" : "dark";
    await execAsync(`xcrun simctl ui ${xcodeSimulator.udid} appearance ${newMode}`);
    await XcodeSimulatorService.trackSimulatorUsage(xcodeSimulator.udid);
    return newMode;
  }
}
