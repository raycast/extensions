import { Grid, ActionPanel, Action, Icon } from "@raycast/api";

import { getImageUrl } from "../lib/cloudinary";
import type { Asset } from "../types/asset";

import ViewResource from "./ViewResource";
import { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";

interface ViewResourcesProps {
  isLoading: boolean;
  resources: Array<Asset>;
  pagination?: UseCachedPromiseReturnType<Asset[], Asset[]>["pagination"];
}

function ViewResources({ resources, isLoading, pagination }: ViewResourcesProps) {
  return (
    <Grid isLoading={isLoading} pagination={pagination}>
      {resources.length > 0 && (
        <Grid.Section title="Results" subtitle={String(resources.length)}>
          {resources.map((resource) => {
            return (
              <Grid.Item
                key={resource.public_id}
                content={resource.secure_url}
                title={resource.public_id}
                actions={
                  <ActionPanel>
                    <Action.Push icon={Icon.Eye} title="View Item" target={<ViewResource resource={resource} />} />
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
