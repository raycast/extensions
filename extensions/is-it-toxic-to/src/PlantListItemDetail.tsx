import { List } from "@raycast/api";
import { ANIMAL_EMOJI_MAP } from "./constants";

type PlantListItemDetailProps = {
  plant: Plant;
};

export default function PlantListItemDetail({ plant }: PlantListItemDetailProps) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={plant.name} />
          <List.Item.Detail.Metadata.Label title="Scientific Name" text={plant.scientificName} />
          {plant.family !== null && <List.Item.Detail.Metadata.Label title="Family" text={plant.family} />}
          {plant.commonNames.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Common Names">
              {plant.commonNames.map((commonName, index) => (
                <List.Item.Detail.Metadata.TagList.Item key={index} text={commonName} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Toxic to">
            {plant.toxicTo.map((animal, index) => (
              <List.Item.Detail.Metadata.TagList.Item
                key={index}
                text={`${ANIMAL_EMOJI_MAP[animal]} ${animal[0].toUpperCase()}${animal.substring(1).toLowerCase()}`}
              />
            ))}
          </List.Item.Detail.Metadata.TagList>
          {plant.toxicPrinciples !== null && (
            <List.Item.Detail.Metadata.Label title="Toxic Principles" text={plant.toxicPrinciples} />
          )}
          {plant.clinicalSigns !== null && (
            <List.Item.Detail.Metadata.Label title="Clinical Signs" text={plant.clinicalSigns} />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link title="Full details" text="ASPCA website" target={plant.link} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
