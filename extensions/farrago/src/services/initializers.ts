import { getPreferences } from "@/utils/helpers";

import { FarragoOscReceiver } from "./farrago-osc/farragoOscReceiver";
import { FarragoOscSender } from "./farrago-osc/farragoOscSender";
import { FarragoDataParser } from "./farrago/farragoDataParser";
import { FarragoDataSource } from "./farrago/farragoDataSource";

export const initializeFarragoDataParser = () => {
  const { farragoDataDir } = getPreferences();
  return new FarragoDataParser({ farragoDataDir: farragoDataDir });
};

export const initializeFarragoDataSource = () => {
  return new FarragoDataSource();
};

export const initializeFarragoOscSender = () => {
  const { oscRemoteHost, oscRemotePort } = getPreferences();
  return new FarragoOscSender(oscRemoteHost, +oscRemotePort);
};

export const initializeFarragoOscReceiver = () => {
  const { oscLocalHost, oscLocalPort } = getPreferences();
  return new FarragoOscReceiver(oscLocalHost, +oscLocalPort);
};
