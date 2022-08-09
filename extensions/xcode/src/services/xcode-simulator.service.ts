import { XcodeSimulator } from "../models/xcode-simulator/xcode-simulator.model";
import { execAsync } from "../shared/exec-async";
import { XcodeSimulatorGroup } from "../models/xcode-simulator/xcode-simulator-group.model";
import { XcodeSimulatorState } from "../models/xcode-simulator/xcode-simulator-state.model";

/**
 * XcodeSimulatorService
 */
export class XcodeSimulatorService {
  /**
   * Retrieve all XcodeSimulatorGroups
   */
  static async xcodeSimulatorGroups(): Promise<XcodeSimulatorGroup[]> {
    const simulators = await XcodeSimulatorService.xcodeSimulators();
    const groupMap = new Map<string, XcodeSimulator[]>();
    for (const simulator of simulators) {
      const groupedSimulators = groupMap.get(simulator.runtime);
      if (groupedSimulators) {
        groupedSimulators.push(simulator);
      } else {
        groupMap.set(simulator.runtime, [simulator]);
      }
    }
    const xcodeSimulatorGroups: XcodeSimulatorGroup[] = [];
    for (const [runtime, simulators] of groupMap.entries()) {
      xcodeSimulatorGroups.push({
        runtime,
        simulators,
      });
    }
    return xcodeSimulatorGroups.sort((lhs, rhs) => lhs.runtime.localeCompare(rhs.runtime));
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
      // Throw Error
      throw new Error("Simulators are unavailable");
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
   * @param xcodeSimulator The XcodeSimulator to boot
   */
  static boot(xcodeSimulator: XcodeSimulator): Promise<void> {
    return execAsync(`xcrun simctl boot ${xcodeSimulator.udid}`).then();
  }

  /**
   * Shutdown XcodeSimulator
   * @param xcodeSimulator The XcodeSimulator to shutdown
   */
  static shutdown(xcodeSimulator: XcodeSimulator): Promise<void> {
    // Shutdown Simulator
    return execAsync(`xcrun simctl shutdown ${xcodeSimulator.udid}`).then();
  }

  /**
   * Toggle XcodeSimulator
   */
  static toggle(xcodeSimulator: XcodeSimulator): Promise<void> {
    switch (xcodeSimulator.state) {
      case XcodeSimulatorState.booted:
        return XcodeSimulatorService.shutdown(xcodeSimulator);
      case XcodeSimulatorState.shuttingDown:
        return Promise.resolve();
      case XcodeSimulatorState.shutdown:
        return XcodeSimulatorService.boot(xcodeSimulator);
    }
  }
}
