import { Detail, Icon } from "@raycast/api";
import { type UsePromiseReturnType } from "@raycast/utils/dist/types";
import { type PlayerStatus } from "../hooks/usePlayerStatus";
import { useRadio } from "../hooks/useRadio";
import { type Radio } from "../lib/radioDB";
import { cache } from "../lib/cache";
import { SignalStrength } from "../lib/rssiToSignalStrength";

interface PlayerDetailsProps {
  playerStatus: UsePromiseReturnType<PlayerStatus>;
}

export function PlayerDetails(props: PlayerDetailsProps) {
  const {
    playerStatus: { data, isLoading, error },
  } = props;
  const isPlayerAvailable = !isLoading && !error;
  const isPlayerStopped = data?.isStopped;
  const recording = data?.recording;
  const { data: radio = null } = useRadio(data?.title || cache.lastPlayedRadioUrl || "");
  const isRadio = isRadioInstance(radio);

  return isPlayerAvailable ? (
    <Detail.Metadata>
      {!isPlayerStopped &&
        radio && [
          <Detail.Metadata.Label key="radio" title="Radio" text={isRadioInstance(radio) ? radio.title : radio} />,
          isRadio && !!radio.description && (
            <Detail.Metadata.Label key="radioDescription" title="Description" text={radio.description} />
          ),
          <Detail.Metadata.Separator key="separator" />,
        ]}
      {!isPlayerStopped &&
        recording &&
        recording.title &&
        recording.artist && [
          <Detail.Metadata.Label key="title" title="Title" text={recording.title} />,
          <Detail.Metadata.Label key="artist" title="Artist" text={recording.artist} />,
          recording.album && <Detail.Metadata.Label key="album" title="Album" text={recording.album} />,
          recording.date && <Detail.Metadata.Label key="releaseDate" title="Release date" text={recording.date} />,
          recording.length && <Detail.Metadata.Label key="length" title="Length" text={recording.length} />,
          <Detail.Metadata.Separator key="separator" />,
        ]}
      <Detail.Metadata.Label title="Volume" text={data!.volume.toString()} />
      {data!.signalStrength && [
        <Detail.Metadata.Separator key="separator" />,
        <Detail.Metadata.Label
          key="connectedTo"
          title="Connected to"
          icon={Icon.Wifi}
          text={data!.ssid || "Unknown"}
        />,
        <Detail.Metadata.Label
          key="signalStrength"
          title="Signal strength"
          icon={getSignalStrengthIcon(data!.signalStrengthLevel!)}
          text={`${data!.signalStrength} dBm`}
        />,
        <Detail.Metadata.Label key="ipAddress" title="IP address" text={data!.url} />,
      ]}
    </Detail.Metadata>
  ) : null;
}

function isRadioInstance(radio: Radio | string | null): radio is Radio {
  return !!radio && !!(radio as Radio).id && !!(radio as Radio).url;
}

function getSignalStrengthIcon(signalStrengthLevel: SignalStrength): Icon {
  switch (signalStrengthLevel) {
    case SignalStrength.Excellent:
      return Icon.FullSignal;
    case SignalStrength.Good:
      return Icon.Signal3;
    case SignalStrength.Fair:
      return Icon.Signal2;
    case SignalStrength.Poor:
      return Icon.Signal1;
  }
}
