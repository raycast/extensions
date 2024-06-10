import { Fragment } from "react";
import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { getImageSections } from "@/lib";
import usePlant from "@/hooks/usePlant";
import PlantDetailSpeciesImages from "@/components/PlantDetailSpeciesImages";

const PlantDetail = ({ id }: { id: number }) => {
  const { data, isLoading } = usePlant(id);

  if (isLoading) {
    return <Detail isLoading={true} markdown={`Loading...`} />;
  }

  if (!data || !data.data) {
    return <Detail isLoading={false} markdown={`# Plant Detail\n\nPlant with ID ${id} not found`} />;
  }

  const plant = data.data;
  const species = plant.main_species;
  const image = plant.image_url || species?.image_url;

  const imageSections = getImageSections(species);

  const markDown = `# ${plant.scientific_name}
${plant.common_name ? `> Common name: ${plant.common_name}\n\n` : ""}
${image ? `\n<img alt="${plant.scientific_name}" src="${image}" height="300" />\n\n` : ""}

*Synonyms*: ${
    species?.synonyms
      ?.filter((s) => !!s.name)
      .map((s) => `_${s.name}_`)
      .join(", ") || "N/A"
  }
`;

  return (
    <Detail
      markdown={markDown}
      actions={
        <ActionPanel>
          {imageSections.length > 0 ? (
            <Action.Push
              title="Show Images"
              target={<PlantDetailSpeciesImages species={species} />}
              icon={Icon.Image}
            />
          ) : null}
          <Action.CopyToClipboard title="Copy Scientific Name" content={plant.scientific_name} />
          <Action.CopyToClipboard title="Copy Plant JSON" content={JSON.stringify(plant, null, 2)} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Scientific Name" text={plant.scientific_name} />
          {plant.common_name && <Detail.Metadata.Label title="Common Name" text={plant.common_name} />}
          <Detail.Metadata.Separator />
          {species ? (
            <Fragment>
              {species.family && <Detail.Metadata.Label title="Family" text={species.family} />}
              {species.family_common_name && (
                <Detail.Metadata.Label title="Family Common Name" text={species.family_common_name} />
              )}
              {species.genus && <Detail.Metadata.Label title="Genus" text={species.genus} />}
              {species.duration && (
                <Detail.Metadata.TagList title="Duration">
                  {species.duration
                    .filter((d) => d && d !== "null")
                    .map((d) => (
                      <Detail.Metadata.TagList.Item key={d} text={d} />
                    ))}
                </Detail.Metadata.TagList>
              )}
              {species?.specifications?.growth_habit && (
                <Detail.Metadata.Label title="Growth Habit" text={species.specifications.growth_habit} />
              )}
              <Detail.Metadata.Separator />
              {species.status && (
                <Detail.Metadata.Label title="Status" text={species.status === "accepted" ? "Accepted" : "Unknown"} />
              )}
              {species.bibliography && <Detail.Metadata.Label title="Bibliography" text={species.bibliography} />}
              {species.author && <Detail.Metadata.Label title="Author" text={species.author} />}
              {species.year && <Detail.Metadata.Label title="Year" text={species.year.toString()} />}
            </Fragment>
          ) : null}
          {plant.sources && plant.sources.length > 0
            ? plant.sources.map((source, index) => (
                <Fragment key={`source-${index}`}>
                  <Detail.Metadata.Separator />
                  <Detail.Metadata.Label title="Source" text={source.name} />
                  {source.citation ? <Detail.Metadata.Label title="Citation" text={source.citation} /> : null}
                  {source.last_update ? <Detail.Metadata.Label title="Last Update" text={source.last_update} /> : null}
                  {source.url ? <Detail.Metadata.Link title="URL" target={source.url} text={source.url} /> : null}
                </Fragment>
              ))
            : null}
        </Detail.Metadata>
      }
    />
  );
};

export default PlantDetail;
