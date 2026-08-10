import { Action } from "@raycast/api";
import { playRemoteAudio } from "./utils/helpers";
import RabbitAsset from "./rabbitAsset";

interface RemotePlayProps {
  file: string;
}

const RemotePlay: React.FC<RemotePlayProps> = ({ file }) => {
  if (!file) return null;

  const audioFile = RabbitAsset(file as string);

  return <Action title="Play Recording" onAction={() => playRemoteAudio(audioFile)} />;
};

export default RemotePlay;
