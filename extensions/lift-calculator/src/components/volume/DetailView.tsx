import { List } from "@raycast/api";
import { VolumeResult } from "../../types/volume";
import { formatWeight } from "../../utils/formatting";
import { VOLUME_RESOURCES } from "../../constants/volume";

interface DetailViewProps {
  result: VolumeResult;
  unitSystem: "kg" | "lbs";
}

export const DetailView: React.FC<DetailViewProps> = ({ result, unitSystem }) => (
  <List.Item.Detail
    markdown={result.description}
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label
          title="Training Goal"
          text={result.goal.charAt(0).toUpperCase() + result.goal.slice(1)}
        />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="Workout Structure" />
        <List.Item.Detail.Metadata.Label title="Sets" text={result.scheme.sets.toString()} />
        <List.Item.Detail.Metadata.Label title="Reps per Set" text={result.scheme.reps.toString()} />
        <List.Item.Detail.Metadata.Label title="Weight" text={formatWeight(result.weight, unitSystem)} />
        <List.Item.Detail.Metadata.Label title="Rest Between Sets" text={`${result.scheme.restMinutes} minutes`} />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="Volume Analysis" />
        <List.Item.Detail.Metadata.Label title="Total Reps" text={result.totalReps.toString()} />
        <List.Item.Detail.Metadata.Label
          title="Volume Load"
          text={`${formatWeight(result.totalVolume, unitSystem)} total`}
        />
        <List.Item.Detail.Metadata.Label
          title="Intensity"
          text={`${(result.scheme.percentage * 100).toFixed(0)}% of 1RM`}
        />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="Resources" />
        <List.Item.Detail.Metadata.Link title="Wikipedia" target={VOLUME_RESOURCES.LINKS.WIKI} text="Wikipedia" />
        <List.Item.Detail.Metadata.Link
          title="Training Volume Guidelines"
          target={VOLUME_RESOURCES.LINKS.GENERAL}
          text={VOLUME_RESOURCES.DOCS.GENERAL}
        />
        <List.Item.Detail.Metadata.Link
          title="Scientific Research"
          // Using hypertrophy research for power/endurance since we don't have specific links for those goals
          target={result.goal === "strength" ? VOLUME_RESOURCES.LINKS.STRENGTH : VOLUME_RESOURCES.LINKS.HYPERTROPHY}
          text={result.goal === "strength" ? VOLUME_RESOURCES.DOCS.STRENGTH : VOLUME_RESOURCES.DOCS.HYPERTROPHY}
        />
      </List.Item.Detail.Metadata>
    }
  />
);
