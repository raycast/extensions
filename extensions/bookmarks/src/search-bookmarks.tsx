import { List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { useBookmarks } from "./api";
import BookmarkActions from "./actions";

export default function Command() {
  const { data, isLoading, revalidate } = useBookmarks();

  return (
    <List isLoading={isLoading}>
      {data?.map((bookmark) => (
        <List.Item
          key={bookmark.link}
          icon={getAvatarIcon(`${bookmark.title}`)}
          title={`${bookmark.title}`}
          subtitle={bookmark.link}
          accessories={[
            {
              tooltip: `Test tooltips`,
            },
          ]}
          actions={
            <BookmarkActions
              bookmark={bookmark}
              onUpdateBookmark={revalidate}
              onDeleteBookmark={revalidate}
              showDetail
            />
          }
        />
      ))}
    </List>
  );
}
