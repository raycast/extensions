import { stringToBool } from "./shared/utils";
import { AppleScriptResponse, SoundOutputDevice } from "./shared/types";

export default class AppleScriptParser implements AppleScriptParser {
  parse(input: AppleScriptResponse): Array<SoundOutputDevice> {
    const deviceNames = this.parseDeviceNames(input);
    const deviceConnections = this.parseDeviceConnections(input);

    const response = Array<SoundOutputDevice>();

    if (deviceNames.length != deviceConnections.length) {
      console.log(
        `[ERROR]: the number of devices ${deviceNames.length} is not equal to the number of connections ${deviceConnections.length}`
      );
      return response;
    }

    for (let index = 0; index < deviceNames.length; index++) {
      const deviceName = deviceNames[index];
      const deviceConnection = deviceConnections[index];
      response.push(<SoundOutputDevice>{ name: deviceName, isConnected: deviceConnection });
    }

    console.log(`[INFO]: Returning response: ${JSON.stringify(response)}`);
    return response;
  }

  parseDeviceNames(input: AppleScriptResponse): Array<string> {
    const splittedInput = this.splitInput(input);

    const deviceNames = splittedInput.filter((value: string, index: number) => {
      const isDeviceNameIndex = index % 2 === 0;
      const sanitizedValue = value.trim();
      if (isDeviceNameIndex) {
        return sanitizedValue;
      }
    });

    console.log(`[INFO]: Parsed device names: ${deviceNames} in response`);
    return deviceNames;
  }

  parseDeviceConnections(input: AppleScriptResponse): Array<boolean> {
    const splittedInput = this.splitInput(input);

    const deviceConnections: Array<boolean> = splittedInput
      .filter((_, index) => {
        const isDeviceConnectionIndex = index % 2 === 1;
        return isDeviceConnectionIndex;
      })
      .map((value: string) => {
        const sanitizedValue = value.trim();
        return stringToBool(sanitizedValue);
      });

    console.log(`[INFO]: Parsed connection states: ${deviceConnections} in response`);
    return deviceConnections;
  }

  splitInput(input: AppleScriptResponse): Array<string> {
    // Input is a comma-separated string
    // for example: "Macbook Pro Speakers, true, AirPods Pro, false"
    // the first value is name of the device
    // second value is connection status of that device
    const splittedInput = input.split(",");

    if (splittedInput.length % 2 != 0) {
      console.log(
        `[ERROR]: The number of elements in the apple script response is not equal to an even number : ${splittedInput.length}`
      );
      console.log(`[ERROR]: Return a empty array`);
      return Array<string>();
    }

    return splittedInput;
  }
}
