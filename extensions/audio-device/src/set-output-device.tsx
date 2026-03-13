import { DeviceList } from "./helpers";

interface Context {
  deviceId?: string;
  deviceName?: string;
}

export default function Command({ launchContext }: { launchContext?: Context }) {
  return <DeviceList ioType="output" deviceId={launchContext?.deviceId} deviceName={launchContext?.deviceName} />;
}
