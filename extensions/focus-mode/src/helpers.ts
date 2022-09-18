import { runAppleScript } from "run-applescript";
import {
  FocusModeAssertion,
  FocusModeConfig,
  FocusOption,
  getFocusListAssertionsScript,
  getFocusListConfigScript,
} from "./utils";

export async function getFocusOptions() {
  const focusModeConfig: FocusModeConfig = JSON.parse(await runAppleScript(getFocusListConfigScript));
  const focusModeAssertion: FocusModeAssertion = JSON.parse(await runAppleScript(getFocusListAssertionsScript));

  const { modeConfigurations } = focusModeConfig.data[0];
  const { storeAssertionRecords } = focusModeAssertion.data[0];

  const focusOptions: FocusOption[] = Object.keys(modeConfigurations).map((config) => {
    const { triggers, mode } = modeConfigurations[config];
    const { name, modeIdentifier, symbolImageName } = mode;

    /**
     * This is needed because macOS can translate the default Sleep mode name to the
     * current main language but when changing the focus mode to this one
     * it needs to be changed by using `Sleep` as the name of the focus mode.
     */
    const isSleepMode =
      triggers.triggers.length && triggers.triggers[0].class === "DNDModeConfigurationSleepingTrigger";

    return {
      name: isSleepMode ? "Sleep" : name,
      symbolImageName,
      modeIdentifier,
      isActive: !!(
        storeAssertionRecords?.length &&
        storeAssertionRecords[0].assertionDetails.assertionDetailsModeIdentifier === config
      ),
    };
  });

  return focusOptions;
}
