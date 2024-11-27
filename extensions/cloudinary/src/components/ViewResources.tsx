import { Grid, ActionPanel, Action, useNavigation } from "@raycast/api";

import { getImageUrl } from "../lib/cloudinary";
import type { Asset } from "../types/asset";

import ViewResource from "./ViewResource";

interface ViewResourcesProps {
  isLoading: boolean;
  resources?: Array<Asset>;
}

function ViewResources({ resources, isLoading }: ViewResourcesProps) {
  const { push } = useNavigation();

  return (
    <Grid isLoading={isLoading}>
      {Array.isArray(resources) && resources.length > 0 && (
        <Grid.Section title="Results" subtitle={String(resources.length)}>
          {resources.map((resource) => {
            function handleOnViewItem() {
              push(<ViewResource resource={resource} />);
            }

            return (
              <Grid.Item
                key={resource.public_id}
                content={resource.secure_url}
                title={resource.public_id}
                actions={
                  <ActionPanel>
                    <Action title="Item" onAction={handleOnViewItem} />
                    <Action.CopyToClipboard
                      content={getImageUrl(resource.secure_url, {
                        quality: "auto",
                        fetch_format: "auto",
                      })}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </Grid.Section>
      )}
    </Grid>
  );
}

export default ViewResources;
