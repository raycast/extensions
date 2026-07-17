import { Action, ActionPanel, showToast, Toast } from "@raycast/api";
import { MutatePromise, showFailureToast } from "@raycast/utils";
import { Book, updateBookRating } from "../../api/books";

const RATING_OPTIONS = ["Remove rating", 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

type UpdateBookRatingProps = {
  isLoading: boolean;
  bookId: number;
  mutateBook?: MutatePromise<Book, undefined>;
};

export default function BookRatingSubmenu({ isLoading, bookId, mutateBook }: UpdateBookRatingProps) {
  return (
    <ActionPanel.Submenu title="Update Rating" isLoading={isLoading}>
      {RATING_OPTIONS.map((rating) => (
        <Action
          key={rating}
          title={String(rating)}
          onAction={async () => {
            try {
              showToast({
                style: Toast.Style.Animated,
                title: "Updating...",
              });
              const ratingValue = rating === "Remove rating" ? "" : rating;
              await updateBookRating(bookId, ratingValue);
              if (mutateBook) {
                await mutateBook();
              }
              showToast({
                style: Toast.Style.Success,
                title: "Success",
                message: rating === "Remove rating" ? "Removed rating" : `Updated rating to ${rating} stars`,
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
