import { XcodeSimulator } from "../models/simulator/xcode-simulator.model";
import { execAsync } from "../shared/exec-async";
import { BehaviorSubject, Observable } from "rxjs";
import { showToast, ToastStyle } from "@raycast/api";

/**
 * XcodeSimulatorService
 */
export class XcodeSimulatorService {
  /**
   * The XcodeSimulators BehaviorSubject
   */
  private xcodeSimulatorsSubject = new BehaviorSubject<XcodeSimulator[] | undefined>(undefined);

  /**
   * The XcodeSimulators Observable
   */
  get xcodeSimulators(): Observable<XcodeSimulator[] | undefined> {
    // Refresh XcodeSimulators
    this.refreshXcodeSimulators().then();
    // Return Subject as Observable
    return this.xcodeSimulatorsSubject.asObservable();
  }

  /**
   * Retrieve all installed XcodeSimulators
   */
  async getXcodeSimulators(): Promise<XcodeSimulator[]> {
    // Execute command
    const output = await execAsync("xcrun simctl list -j -v devices");
    // Parse stdout as JSON
    const devicesResponseJSON = JSON.parse(output.stdout);
    // Check if JSON or devices within the JSON are not available
    if (!devicesResponseJSON || !devicesResponseJSON.devices) {
      // Throw Error
      throw new Error("No Devices have been found");
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
  async boot(xcodeSimulator: XcodeSimulator): Promise<void> {
    // Update to pending state
    this.updateToPendingStateIfNeeded(xcodeSimulator);
    // Boot Simulator
    await execAsync(`xcrun simctl boot ${xcodeSimulator.udid}`);
    // Refresh XcodeSimulators
    this.refreshXcodeSimulators().then();
  }

  /**
   * Shutdown XcodeSimulator
   * @param xcodeSimulator The XcodeSimulator to shutdown
   */
  async shutdown(xcodeSimulator: XcodeSimulator): Promise<void> {
    // Update to pending state
    this.updateToPendingStateIfNeeded(xcodeSimulator);
    // Shutdown Simulator
    await execAsync(`xcrun simctl shutdown ${xcodeSimulator.udid}`);
    // Refresh XcodeSimulators
    this.refreshXcodeSimulators().then();
  }

  /**
   * Refresh XcodeSimulators
   */
  private async refreshXcodeSimulators() {
    try {
      // Retrieve XcodeSimulators
      const simulators = await this.getXcodeSimulators();
      // Send XcodeSimulators to Subject
      this.xcodeSimulatorsSubject.next(simulators);
    } catch (error) {
      // Send empty XcodeSimulators to Subject
      this.xcodeSimulatorsSubject.next([]);
      // Show failure Toast
      await showToast(
        ToastStyle.Failure,
        "An error occurred while retrieving the Xcode Simulators",
        (error as Error).message
      );
    }
  }

  /**
   * Update a given XcodeSimulator to pending state if needed
   * @param xcodeSimulator The XcodeSimulator
   */
  private updateToPendingStateIfNeeded(xcodeSimulator: XcodeSimulator) {
    // Retrieve the current XcodeSimulators
    const xcodeSimulators = this.xcodeSimulatorsSubject.value;
    // Check if XcodeSimulators are not available
    if (!xcodeSimulators) {
      // Return out of function
      return;
    }
    // Emit updated XcodeSimulators
    this.xcodeSimulatorsSubject.next(
      xcodeSimulators.map((currentXcodeSimulator) => {
        // Check if current XcodeSimulator matches the given XcodeSimulator
        if (currentXcodeSimulator.udid === xcodeSimulator.udid) {
          // Update state to pending
          currentXcodeSimulator.state = "Pending";
        }
        // Return current XcodeSimulator
        return currentXcodeSimulator;
      })
    );
  }
}
