import { Detail, Icon } from "@raycast/api";

interface DurationProps {
  currentTime: string;
  duration: string;
}

export default function Duration({ currentTime, duration }: DurationProps) {
  return <Detail.Metadata.Label title="Duration" text={`${currentTime} / ${duration}`} icon={Icon.Clock} />;
}
