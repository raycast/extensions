import { runAppleScript, showFailureToast } from "@raycast/utils";
import { showHUD } from "@raycast/api";

import { execSync } from "child_process";

const NORMAL_POWER_MODE = "0";
const LOW_POWER_MODE = "1";
// const HIGH_POWER_MODE = "2"; // unused for now

const POWER_MODE_SETTING_VALUE_DEFAULT = "lowpowermode";
const POWER_MODE_SETTING_VALUE_WITH_HIGH_POWER_MODE = "powermode";

export class PowerManagement {
  powerModeSettingKey: string;

  constructor() {
    const result = execSync(`pmset -g | grep powermode`);

    if (result.toString().trim()) {
      this.powerModeSettingKey = POWER_MODE_SETTING_VALUE_DEFAULT;
    } else {
      this.powerModeSettingKey = POWER_MODE_SETTING_VALUE_WITH_HIGH_POWER_MODE;
    }
  }

  isLowPowerModeEnabled(): boolean | undefined {
    try {
      const result = execSync(`pmset -g | grep ${this.powerModeSettingKey}`);
      const lowPowerModeValue = result.toString().trim().at(-1);

      return lowPowerModeValue === LOW_POWER_MODE;
    } catch (error) {
      showFailureToast(error, { title: "Could not determine the Low Power Mode state" });
    }
  }

  async setLowPowerMode(enable: boolean): Promise<void> {
    try {
      const value = enable ? LOW_POWER_MODE : NORMAL_POWER_MODE;
      await showHUD("Administrator Privileges Required");
      await runAppleScript(
        `do shell script "pmset -a ${this.powerModeSettingKey} ${value}" with administrator privileges`,
      );
      await showHUD(`✅ Low Power Mode is turned ${enable ? "on" : "off"}`);
    } catch (error) {
      showFailureToast(error, { title: "Could not set Low Power Mode" });
    }
  }

  async toggleLowPowerMode(): Promise<void> {
    const lowPowerModeState = this.isLowPowerModeEnabled();
    await this.setLowPowerMode(!lowPowerModeState);
  }
}
