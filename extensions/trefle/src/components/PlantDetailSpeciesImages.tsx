import { Action, ActionPanel, Grid } from "@raycast/api";
import { getImageSections } from "@/lib";
import type { Species } from "@/api";
import PlantImage from "@/components/PlantImage";

const PlantDetailSpeciesImages = ({ species, name }: { species?: Species; name: string }) => {
  const imgSections = getImageSections(species);

  return (
    <Grid navigationTitle={`Images for "${name}"`}>
      {imgSections.map((section) => (
        <Grid.Section key={section.title} title={section.title}>
          {section.images.map((image) =>
            !!image.id && !!image.image_url && !!image.copyright ? (
              <Grid.Item
                key={image.id}
                title={image.copyright}
                content={{ source: image.image_url }}
                actions={
                  <ActionPanel>
                    <Action.Push title="Show Image" target={<PlantImage image={image} name={name} />} />
                    <Action.OpenInBrowser title="Open in Browser" url={image.image_url} />
                  </ActionPanel>
                }
              />
            ) : null,
          )}
        </Grid.Section>
      ))}
    </Grid>
  );
};

export default PlantDetailSpeciesImages;
