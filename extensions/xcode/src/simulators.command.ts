import { useEffect, useState } from "react";
import { XcodeSimulatorService } from "./services/xcode-simulator.service";
import { xcodeSimulatorsList } from "./user-interfaces/xcode-simulators/xcode-simulators-list.user-interface";
import { XcodeSimulator } from "./models/simulator/xcode-simulator.model";
import { groupBy } from "./shared/group-by";
import { map } from "rxjs";

/**
 * Xcode simulators command
 */
export default () => {
  // Use XcodeSimulatorService State
  const [xcodeSimulatorService] = useState<XcodeSimulatorService>(new XcodeSimulatorService());
  // Use XcodeRelease State
  const [xcodeSimulators, setXcodeSimulators] = useState<Map<string, XcodeSimulator[]> | undefined>(undefined);
  // Use Effect
  useEffect(() => {
    // Subscribe to XcodeSimulators Observable
    const subscription = xcodeSimulatorService.xcodeSimulators
      .pipe(
        map((xcodeSimulators) => {
          // Check if XcodeSimulators are available
          if (xcodeSimulators) {
            // Return grouped XcodeSimulators by runtime
            return groupBy(xcodeSimulators, (xcodeSimulator) => xcodeSimulator.runtime);
          } else {
            // Otherwise return undefined
            return undefined;
          }
        })
      )
      .subscribe(setXcodeSimulators);
    return () => {
      // Unsubscribe
      subscription.unsubscribe();
    };
  }, []);
  // Return XcodeSimulator List
  return xcodeSimulatorsList(xcodeSimulators, xcodeSimulatorService);
};
