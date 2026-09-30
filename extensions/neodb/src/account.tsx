import { Icon, List } from "@raycast/api";
import useAuthorizedPaginated from "./hooks/useAuthorizedPaginated";
import { useState } from "react";
import { Collection, Review } from "./types";
import getItemTitle from "./utils/getItemTitle";
import ItemActions from "./components/ItemActions";

export default function Account() {
  const [resource, setResource] = useState("collection");

  const { isLoading: isLoadingCollections, data: collections } = useAuthorizedPaginated<Collection>(resource, {
    execute: resource === "collection",
  });
  const { isLoading: isLoadingReviews, data: reviews } = useAuthorizedPaginated<Review>(resource, {
    execute: resource === "review",
  });

  return (
    <List
      isLoading={isLoadingCollections || isLoadingReviews}
      searchBarPlaceholder={`Search ${resource}`}
      searchBarAccessory={
        <List.Dropdown tooltip="Resource" onChange={setResource}>
          <List.Dropdown.Item icon="default.svg" title="Collections" value="collection" />
          <List.Dropdown.Item icon={Icon.Pencil} title="Reviews" value="review" />
        </List.Dropdown>
      }
    >
      {resource === "collection" &&
        collections.map((collection) => <CollectionItem key={collection.uuid} collection={collection} />)}
      {resource === "review" && reviews.map((review) => <ReviewItem key={review.item.uuid} review={review} />)}
    </List>
  );
}

const getCover = (cover: string) => "https://neodb.social" + cover;
const getVisibilityTag = (visibility: 0 | 1 | 2) => ({
  tag: visibility === 0 ? "Public" : visibility === 1 ? "Followers Only" : "Mentioned Only",
  icon: Icon.Eye,
  tooltip: "Visibility",
});
const getAccessories = (item: Collection | Review) => [
  getVisibilityTag(item.visibility),
  { date: new Date(item.created_time) },
];

const CollectionItem = ({ collection }: { collection: Collection }) => (
  <List.Item
    icon={getCover(collection.cover)}
    title={collection.title}
    subtitle={collection.brief}
    accessories={getAccessories(collection)}
    actions={<ItemActions route={collection.url} />}
  />
);
const ReviewItem = ({ review }: { review: Review }) => (
  <List.Item
    icon={Icon.Pencil}
    title={getItemTitle(review.item)}
    accessories={getAccessories(review)}
    actions={<ItemActions route={review.url} />}
  />
);
