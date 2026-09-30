import { Action, ActionPanel, showToast, Toast } from "@raycast/api";
import { MutatePromise, showFailureToast } from "@raycast/utils";
import { Book, TransformedUserBook, updateBookStatus, UserBookStatusMapping } from "../../api/books";

type UpdateBookStatusProps = {
  isLoading: boolean;
  bookId: number;
  mutateBook?: MutatePromise<Book, undefined>;
  mutateUserBooks?: MutatePromise<TransformedUserBook[], undefined>;
};

export default function BookStatusSubmenu({ isLoading, bookId, mutateBook, mutateUserBooks }: UpdateBookStatusProps) {
  return (
    <ActionPanel.Submenu title="Update Reading Status" isLoading={isLoading}>
      {Object.entries(UserBookStatusMapping).map(([key, val]) => (
        <Action
          key={key}
          title={val}
          onAction={async () => {
            try {
              showToast({
                style: Toast.Style.Animated,
                title: "Updating...",
              });
              await updateBookStatus(bookId, Number(key));
              if (mutateBook) {
                await mutateBook();
              }
              if (mutateUserBooks) {
                await mutateUserBooks();
              }
              showToast({
                style: Toast.Style.Success,
                title: "Success",
                message: `Updated reading status to ${val}`,
              });
            } catch (error) {
              showFailureToast(error);
            }
          }}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
