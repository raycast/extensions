// components/warmup/DetailView.tsx
import { List } from "@raycast/api";
import { WarmupSet } from "../../types/warmup";
import { formatWeight } from "../../utils/formatting";
import { WARMUP_DESCRIPTIONS, WARMUP_RESOURCES } from "../../constants/warmup";

interface DetailViewProps {
  set: WarmupSet;
  unitSystem: "kg" | "lbs";
}

type IntensityLevel = "light" | "medium" | "moderate" | "heavy" | "working";

export const DetailView: React.FC<DetailViewProps> = ({ set, unitSystem }) => {
  const getIntensityLevel = (percentage: number): IntensityLevel => {
    if (percentage <= 0.5) return "light";
    if (percentage <= 0.7) return "medium";
    if (percentage <= 0.8) return "moderate";
    if (percentage <= 0.9) return "heavy";
    return "working";
  };

  const intensityLevel = getIntensityLevel(set.percentage);

  return (
    <List.Item.Detail
      markdown={WARMUP_DESCRIPTIONS.methodology}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Set Details" text={`Set ${set.setNumber} of ${6}`} />
          <List.Item.Detail.Metadata.Label title="Weight" text={formatWeight(set.weight, unitSystem)} />
          <List.Item.Detail.Metadata.Label title="Intensity" text={`${(set.percentage * 100).toFixed(0)}% of target`} />
          <List.Item.Detail.Metadata.Label
            title="Repetitions"
            text={`${set.reps} ${set.reps === 1 ? "rep" : "reps"}`}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Purpose" text={WARMUP_DESCRIPTIONS[intensityLevel]} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Resources" />
          <List.Item.Detail.Metadata.Link title="Wikipedia" target={WARMUP_RESOURCES.LINKS.WIKI} text="Wikipedia" />
          <List.Item.Detail.Metadata.Link
            title="Stronger by Science"
            target={WARMUP_RESOURCES.LINKS.SBS}
            text="Stronger by Science"
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
};
