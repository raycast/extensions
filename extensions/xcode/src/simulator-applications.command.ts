import { useEffect, useState } from "react";
import { showToast, ToastStyle, useNavigation } from "@raycast/api";
import { xcodeSimulatorApplicationList } from "./user-interfaces/xcode-simulator-applications/xcode-simulator-application-list.user-interface";
import { XcodeSimulatorApplicationService } from "./services/xcode-simulator-application.service";
import { XcodeSimulatorApplication } from "./models/simulator/xcode-simulator-application.model";
import { Source } from "./shared/source";

/**
 * Xcode simulator applications command
 */
export default () => {
  // Initialize XcodeSimulatorApplicationService
  const xcodeSimulatorApplicationService = new XcodeSimulatorApplicationService();
  // Use Navigation
  const navigation = useNavigation();
  // Use XcodeSimulatorApplication State
  const [xcodeSimulatorApplications, setXcodeSimulatorApplication] = useState<
    Source<XcodeSimulatorApplication[]> | undefined
  >(undefined);
  // Use Effect
  useEffect(() => {
    // Retrieve cached Xcode Simulator Applications
    xcodeSimulatorApplicationService
      .cachedXcodeSimulatorApplications()
      .then((cachedXcodeSimulatorApplications) => {
        // Check if no XcodeSimulatorApplications have been set
        // and cached XcodeSimulatorApplications are available and not empty
        if (
          !xcodeSimulatorApplications &&
          cachedXcodeSimulatorApplications &&
          cachedXcodeSimulatorApplications.length > 0
        ) {
          // Set cached XcodeSimulatorApplications
          setXcodeSimulatorApplication({
            value: cachedXcodeSimulatorApplications,
            isCache: true,
          });
        }
      })
      .catch(console.error);
    // Retrieve Xcode Simulator Applications
    xcodeSimulatorApplicationService
      .xcodeSimulatorApplications()
      .then((applications) => {
        // Set XcodeSimulatorApplications
        setXcodeSimulatorApplication({
          value: applications,
          isCache: false,
        });
      })
      .catch((error) => {
        // Check if no XcodeSimulatorApplications are available
        if (!xcodeSimulatorApplications) {
          // Set empty applications
          setXcodeSimulatorApplication({
            value: [],
            isCache: false,
          });
        }
        // Log Error
        console.error(error);
        // Show Toast
        return showToast(ToastStyle.Failure, "An error occurred while fetching the Apps", error);
      });
  }, []);
  // Return XcodeRelease List with Navigation
  return xcodeSimulatorApplicationList(xcodeSimulatorApplications, navigation);
};
