import { Detail, Icon } from "@raycast/api";

export function getVolumeIcon(volume: string | undefined) {
  const v = parseInt(volume || "0");
  if (v === 0) return Icon.SpeakerOff;
  if (v <= 33) return Icon.SpeakerLow;
  if (v <= 66) return Icon.SpeakerOn;
  return Icon.SpeakerHigh;
}

export default function VolumeMetadataLabel({ volume, isMuted = false }: { volume: string; isMuted: boolean }) {
  return (
    <Detail.Metadata.Label
      title="Volume"
      text={`${volume}%`}
      icon={isMuted ? Icon.SpeakerOff : getVolumeIcon(volume)}
    />
  );
}
