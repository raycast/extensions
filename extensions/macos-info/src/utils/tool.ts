import { showFailureToast } from "@raycast/utils";
import { getHardwareInfo, HardwareProperty } from "./hardware";
import { getSoftwareInfo, SoftwareProperty } from "./software";

export interface ToolResult {
  answer: string;
  show: boolean;
}

interface HardwareToolConfig {
  type: "hardware";
  property: HardwareProperty;
  formatValue: (value: string) => string;
  errorTitle: string;
  unknownValue: string;
}

interface SoftwareToolConfig {
  type: "software";
  property: SoftwareProperty;
  formatValue: (value: string) => string;
  errorTitle: string;
  unknownValue: string;
}

type ToolConfig = HardwareToolConfig | SoftwareToolConfig;

export async function createTool(config: ToolConfig): Promise<ToolResult> {
  const { type, property, formatValue, errorTitle, unknownValue } = config;

  try {
    if (type === "hardware") {
      return await getHardwareInfo(property, formatValue);
    } else {
      return await getSoftwareInfo(property, formatValue);
    }
  } catch (error) {
    showFailureToast({ title: errorTitle, message: String(error) });
    return {
      answer: unknownValue,
      show: true,
    };
  }
}
