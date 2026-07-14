import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { VolumeItem } from "../types/google-books.dt";
import { formatPrice, getISBN, getMaskedImage } from "../utils/books";
import { BookActionSections } from "../actions/BookActions";
import type { ViewMode } from "./BookGrid";

export function BookListItem({
  item,
  showDetail,
  toggleDetail,
  viewMode,
  onViewModeChange,
  onClearSearch,
}: {
  item: VolumeItem;
  showDetail: boolean;
  toggleDetail: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onClearSearch?: () => void;
}) {
  const price = formatPrice(item);
  const isbn = getISBN(item);
  const vi = item.volumeInfo;

  return (
    <List.Item
      key={item.id}
      icon={getMaskedImage(item)}
      title={vi?.title ?? "Untitled"}
      subtitle={showDetail ? "" : vi?.authors ? vi.authors[0] : "Various Authors"}
      accessories={
        showDetail
          ? []
          : [
              ...(vi?.publishedDate
                ? [{ icon: { source: Icon.Calendar, tintColor: Color.SecondaryText }, text: vi.publishedDate }]
                : []),
              ...(vi?.averageRating
                ? [{ icon: { source: Icon.Star, tintColor: Color.SecondaryText }, text: `${vi.averageRating}/5` }]
                : []),
              ...(vi?.pageCount
                ? [{ icon: { source: Icon.Document, tintColor: Color.SecondaryText }, text: `${vi.pageCount}p` }]
                : []),
            ]
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Type" text={vi?.printType ?? "Book"} icon={Icon.Book} />
              {vi?.authors != null && vi.authors.length > 0 && (
                <List.Item.Detail.Metadata.Label title="Author" text={vi.authors.join(", ")} icon={Icon.Person} />
              )}
              {vi?.publisher != null && vi.publisher !== "" && (
                <List.Item.Detail.Metadata.Label title="Publisher" text={vi.publisher} />
              )}
              {vi?.publishedDate != null && vi.publishedDate !== "" && (
                <List.Item.Detail.Metadata.Label title="Published" text={vi.publishedDate} icon={Icon.Calendar} />
              )}
              <List.Item.Detail.Metadata.Separator />
              {vi?.pageCount != null && vi.pageCount > 0 && (
                <List.Item.Detail.Metadata.Label title="Pages" text={vi.pageCount.toString()} icon={Icon.Document} />
              )}
              {vi?.averageRating != null && (
                <List.Item.Detail.Metadata.Label
                  title="Rating"
                  text={`${vi.averageRating}/5${vi.ratingsCount ? ` (${vi.ratingsCount} ratings)` : ""}`}
                  icon={Icon.Star}
                />
              )}
              {vi?.language != null && vi.language !== "" && (
                <List.Item.Detail.Metadata.Label title="Language" text={vi.language.toUpperCase()} icon={Icon.Globe} />
              )}
              {vi?.maturityRating != null && vi.maturityRating !== "NOT_MATURE" && (
                <List.Item.Detail.Metadata.Label title="Maturity" text={vi.maturityRating} />
              )}
              <List.Item.Detail.Metadata.Separator />
              {price != null && <List.Item.Detail.Metadata.Label title="Price" text={price} icon={Icon.BankNote} />}
              {item.saleInfo?.isEbook !== undefined && (
                <List.Item.Detail.Metadata.Label
                  title="eBook"
                  text={item.saleInfo.isEbook ? "Yes" : "No"}
                  icon={Icon.Monitor}
                />
              )}
              {isbn != null && <List.Item.Detail.Metadata.Label title="ISBN" text={isbn} icon={Icon.BarCode} />}
              {vi?.categories != null && vi.categories.length > 0 && (
                <List.Item.Detail.Metadata.TagList title="Categories">
                  {vi.categories.map((cat) => (
                    <List.Item.Detail.Metadata.TagList.Item key={cat} text={cat} color={Color.Blue} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              )}
              <List.Item.Detail.Metadata.Separator />
              {(vi?.infoLink ?? item.selfLink) != null && (vi?.infoLink ?? item.selfLink) !== "" && (
                <List.Item.Detail.Metadata.Link
                  title="Google Books"
                  text="Open"
                  target={(vi?.infoLink ?? item.selfLink)!}
                />
              )}
              {item.saleInfo?.buyLink != null && item.saleInfo.buyLink !== "" && (
                <List.Item.Detail.Metadata.Link title="Buy" text="Purchase" target={item.saleInfo.buyLink} />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <BookActionSections
            item={item}
            toggleDetail={toggleDetail}
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            onClearSearch={onClearSearch}
          />
        </ActionPanel>
      }
    />
  );
}
