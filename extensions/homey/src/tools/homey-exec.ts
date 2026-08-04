import { Homey } from "../lib/Homey";

type Input = {
  /**
   * The action to execute for now only "toggle", "on" and "off", "run-flow" are supported
   */
  action: string;
  /**
   * The device id to execute the action on
   */
  deviceId?: string;
  /**
   * The flow id to execute the action on
   */
  flowId?: string;
  /**
   * The advanced flag to execute the flow on
   */
  advanced?: boolean;
};

type Result =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
    };

export default async function tool(input: Input): Promise<Result> {
  const homey = new Homey();
  try {
    await homey.auth();
    await homey.selectFirstHomey();
    if (input.action === "toggle") {
      if (!input.deviceId) {
        return { success: false, error: "deviceId is required for toggle" };
      }
      console.log("toggle", input.deviceId);
      await homey.toggleDevice(input.deviceId);
    } else if (input.action === "on") {
      if (!input.deviceId) {
        return { success: false, error: "deviceId is required for on" };
      }
      console.log("on", input.deviceId);
      await homey.turnOnDevice(input.deviceId);
    } else if (input.action === "off") {
      if (!input.deviceId) {
        return { success: false, error: "deviceId is required for off" };
      }
      console.log("off", input.deviceId);
      await homey.turnOffDevice(input.deviceId);
    } else if (input.action === "run-flow") {
      if (!input.flowId) {
        return { success: false, error: "flowId is required for run-flow" };
      }
      console.log("run-flow", input.flowId, input.advanced);
      await homey.triggerFlow(input.flowId, input.advanced);
    } else {
      return {
        success: false,
        error: "Action not supported",
      };
    }
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to execute Homey action",
    };
  }
  return {
    success: true,
  };
}
