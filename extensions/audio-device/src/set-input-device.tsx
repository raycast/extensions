import { DeviceList } from "./helpers";

interface Props {
  launchContext?: {
    deviceId?: string;
    deviceName?: string;
  };
}

export default function Command({ launchContext }: Props) {
  return <DeviceList ioType="input" deviceId={launchContext?.deviceId} deviceName={launchContext?.deviceName} />;
}
