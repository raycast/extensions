import { Action, ActionPanel, Detail } from "@raycast/api";
import type { SpeciesImagesFlowerInner } from "@/api/api";

const PlantImage = ({ image }: { image: SpeciesImagesFlowerInner }) => {
  return (
    <Detail
      markdown={`
> ${image.copyright!}

![${image.id}](${image.image_url})`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={image.image_url!} />
        </ActionPanel>
      }
    />
  );
};

export default PlantImage;
