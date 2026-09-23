import { LaunchProps } from "@raycast/api";
import { SilentVolume, VolumeForm } from "./volume-form";

export default function Command({ arguments: args }: LaunchProps<{ arguments: Arguments.SetInputVolume }>) {
  const volume = args.volume?.trim();
  if (volume) return <SilentVolume ioType="input" level={volume} />;
  return <VolumeForm ioType="input" />;
}
