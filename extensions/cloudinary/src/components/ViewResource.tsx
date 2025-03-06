import { List, ActionPanel, Action } from "@raycast/api";

import { getImageUrl } from "../lib/cloudinary";
import { getOtherResolutions } from "../lib/extension";
import type { Asset } from "../types/asset";
import { useCachedPromise } from "@raycast/utils";

interface ViewResourceProps {
  isLoading?: boolean;
  resource?: Asset;
}

function ViewResource({ resource, isLoading }: ViewResourceProps) {
  const { isLoading: isFetching, data: listItems } = useCachedPromise(
    async () => {
      const optimizedUrl =
        resource?.public_id &&
        getImageUrl(resource.public_id, {
          quality: "auto",
          fetch_format: "auto",
        });

      const listItems = [];

      if (optimizedUrl) {
        listItems.push({
          title: "Optimized",
          icon: "url.png",
          assetUrl: optimizedUrl,
          previewUrl: optimizedUrl,
          detail: `![Uploaded Image Optimized](${optimizedUrl})`,
        });
      }

      if (resource?.secure_url) {
        listItems.push({
          title: "Raw",
          icon: "url.png",
          assetUrl: resource.secure_url,
          previewUrl: optimizedUrl,
          detail: `![Uploaded Image Raw](${optimizedUrl})`,
        });
      }

      if (resource && optimizedUrl) {
        listItems.push(...getOtherResolutions(resource, optimizedUrl));
      }

      return listItems;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isShowingDetail isLoading={isLoading || isFetching}>
      {listItems.map((item) => {
        return (
          <List.Item
            key={item.title}
            title={item.title}
            icon={item.icon}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={item.assetUrl} />
              </ActionPanel>
            }
            detail={<List.Item.Detail markdown={item.detail} />}
          />
        );
      })}
    </List>
  );
}

export default ViewResource;
