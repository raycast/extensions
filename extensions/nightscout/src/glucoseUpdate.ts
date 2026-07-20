import {
  showHUD,
  getPreferenceValues,
  updateCommandMetadata,
  LaunchProps,
  LaunchType,
  launchCommand,
} from "@raycast/api";
import { glucoseService, getGlucoseConfig, treatmentService, statusService } from "./services";
import { createPreferencesError } from "./utils/errorHandling";
import { mgdlToMMOL } from "./utils/unitConversion";
import { getDirectionArrow, getTimeAgo } from "./utils/glucoseStats";

export default async function GlucoseUpdate(props: LaunchProps) {
  const preferences = getPreferenceValues<Preferences>();

  const preferencesError = createPreferencesError(preferences);
  if (preferencesError) {
    return null;
  }

  const refreshGlucose = async () => {
    try {
      const config = getGlucoseConfig();
      const resultGlucose = await glucoseService.refreshReadings(config);
      const resultTreatments = await treatmentService.refreshTreatments(config);

      if (resultGlucose.error) {
        console.error("Failed to fetch glucose data:", resultGlucose.error);
        return;
      }

      if (resultTreatments.error) {
        console.error("Failed to fetch treatment data:", resultTreatments.error);
        return;
      }

      const latestReading = resultGlucose.readings[0];

      const statusResult = await statusService.getUnits(config);
      let useMmol = false;
      if (statusResult.units) {
        useMmol = statusResult.units === "mmol";
      }

      const value = useMmol ? mgdlToMMOL(latestReading.sgv) : latestReading.sgv;
      const unit = useMmol ? "mmol/L" : "mg/dL";
      const direction = getDirectionArrow(latestReading.direction || "");
      const timeAgo = getTimeAgo(latestReading.date);
      console.debug(`Latest glucose: ${value} ${unit} ${direction} (${timeAgo})`);

      await updateCommandMetadata({ subtitle: `${value} ${unit} ${direction} (${timeAgo})` });
      launchCommand({ name: "glucoseMenuBar", type: LaunchType.Background });

      if (props.launchType === LaunchType.UserInitiated) {
        showHUD(`Glucose updated: ${value} ${unit} ${direction} (${timeAgo})`);
      }
    } catch (error) {
      console.error("Failed to update glucose:", error);
    }
  };

  await refreshGlucose();

  return null;
}
