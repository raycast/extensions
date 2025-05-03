import { List } from "@raycast/api";
import type { JustWatchMedia } from "@/types";

type Props = {
  media: JustWatchMedia;
};

export const DetailNoOffers = ({ media }: Props) => {
  return (
    <List.Item.Detail
      markdown={`
# ${media.name} (${media.year})
<img src="${media.thumbnail}" height="180"/>
This is not available to watch on any of the services you selected.
Try changing the country or updating your selection of services in preferences.
`}
    />
  );
};
