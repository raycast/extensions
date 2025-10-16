import { List } from "@raycast/api";
import { MaxResult } from "../../types/max";
import { formatWeight } from "../../utils/formatting";
import { MAX_RESOURCES } from "../../constants/max";

interface DetailViewProps {
  result: MaxResult;
  unitSystem: "kg" | "lbs";
}

export const DetailView: React.FC<DetailViewProps> = ({ result, unitSystem }) => (
  <List.Item.Detail
    markdown={result.text ?? ""}
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Details" />
        {result.scheme && (
          <List.Item.Detail.Metadata.Label
            title="Repetition Scheme"
            icon={{ source: result.icon, tintColor: result.tintColor }}
            text={result.scheme}
          />
        )}
        <List.Item.Detail.Metadata.Label title="Weight" text={formatWeight(result.value, unitSystem)} />
        <List.Item.Detail.Metadata.Label title="Repetitions" text={result.label} />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="Resources" />
        <List.Item.Detail.Metadata.Link title="Wikipedia" target={MAX_RESOURCES.LINKS.WIKI} text="Wikipedia" />
        <List.Item.Detail.Metadata.Link
          title="Epley Formula"
          target={MAX_RESOURCES.LINKS.EPLEY_FORMULA}
          text="Epley Formula"
        />
      </List.Item.Detail.Metadata>
    }
  />
);
