import { DeviceList } from "./helpers";

interface Props {
  launchContext?: {
    deviceId?: string;
  };
}

export default function Command({ launchContext }: Props) {
  return <DeviceList type="input" deviceId={launchContext?.deviceId} />;
}
