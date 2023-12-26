import { runAppleScript, showFailureToast } from "@raycast/utils";
import { showHUD } from "@raycast/api";

import { execSync } from "child_process";

const POWER_MODE_SETTING_VALUE_DEFAULT = "lowpowermode";
const POWER_MODE_SETTING_VALUE_WITH_HIGH_POWER_MODE = "powermode";

const LOW_POWER_MODE_ENABLED = "1";

class PowerManagement {
  powerModeSettingValue: string = "";

  constructor() {
    const result = execSync(`pmset -g | grep ${POWER_MODE_SETTING_VALUE_DEFAULT}`);

    if (result.toString().trim()) {
      this.powerModeSettingValue = POWER_MODE_SETTING_VALUE_DEFAULT;
    } else {
      this.powerModeSettingValue = POWER_MODE_SETTING_VALUE_WITH_HIGH_POWER_MODE;
    }
  }

  getLowPowerModeState(): boolean | undefined {
    try {
      const result = execSync(`pmset -g | grep ${this.powerModeSettingValue}`);
      const lowPowerModeValue = result.toString().trim().at(-1);
      return lowPowerModeValue === LOW_POWER_MODE_ENABLED;
    } catch (error) {
      showFailureToast(error, { title: "Could not determine the Low Power Mode state" });
    }
  }

  async setLowPowerModeState(lowPowerModeState: boolean): Promise<void> {
    try {
      const value = lowPowerModeState ? "1" : "0";
      await showHUD("Administrator Privileges Required");
      await runAppleScript(
        `do shell script "pmset -a ${this.powerModeSettingValue} ${value}" with administrator privileges`,
      );
      await showHUD(`✅ Low Power Mode is turned ${lowPowerModeState ? "on" : "off"}`);
    } catch (error) {
      showFailureToast(error, { title: "Could not Toggle Low Power Mode" });
    }
  }

  async toggleLowPowerMode(): Promise<void> {
    const lowPowerModeState = this.getLowPowerModeState();
    await this.setLowPowerModeState(!lowPowerModeState);
  }
}

export const powerManagement = new PowerManagement();
