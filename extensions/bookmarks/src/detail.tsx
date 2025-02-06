import { Detail, useNavigation } from "@raycast/api";
import BookmarkActions from "./actions";
import { Bookmark, useBookmark } from "./api";

export default function BookmarkDetail(props: { bookmark: Bookmark }) {
  const { pop } = useNavigation();
  const { data, isLoading, revalidate } = useBookmark(props.bookmark);

  console.log(data);

  return (
    <Detail
      isLoading={isLoading}
      markdown={`# ${data.title}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label key="title" title="title" text={data.title} />
          <Detail.Metadata.Label key="link" title="link" text={data.link} />
          <Detail.Metadata.Label key="tags" title="tags" text={data.tags} />
          <Detail.Metadata.Label key="description" title="description" text={data.description} />
        </Detail.Metadata>
      }
      actions={<BookmarkActions bookmark={data} onDeleteBookmark={pop} onUpdateBookmark={revalidate} />}
    />
  );
}
