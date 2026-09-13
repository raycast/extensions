import { LaunchProps } from "@raycast/api";
import { SilentVolume, VolumeForm } from "./volume-form";

interface Arguments {
  volume?: string;
}

export default function Command({ arguments: args }: LaunchProps<{ arguments: Arguments }>) {
  const volume = args?.volume?.trim();
  if (volume) return <SilentVolume ioType="output" level={volume} />;
  return <VolumeForm ioType="output" />;
}
