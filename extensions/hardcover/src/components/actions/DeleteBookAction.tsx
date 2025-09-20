import { Action, confirmAlert, showToast, Toast } from "@raycast/api";
import { MutatePromise, showFailureToast } from "@raycast/utils";
import { Book, removeBookStatus, TransformedUserBook } from "../../api/books";

type DeleteBookProps = {
  userBookId: number;
  mutateBook?: MutatePromise<Book, undefined>;
  mutateUserBooks?: MutatePromise<TransformedUserBook[], undefined>;
};

export default function DeleteBookAction({ userBookId, mutateBook, mutateUserBooks }: DeleteBookProps) {
  return (
    <Action
      title="Remove"
      style={Action.Style.Destructive}
      onAction={async () => {
        try {
          if (
            await confirmAlert({
              title: "Are you sure?",
              message: "This will remove your review, rating and status.",
            })
          ) {
            showToast({
              style: Toast.Style.Animated,
              title: "Removing...",
            });
            await removeBookStatus(userBookId);
            if (mutateBook) {
              await mutateBook();
            }
            if (mutateUserBooks) {
              await mutateUserBooks();
            }
            showToast({
              style: Toast.Style.Success,
              title: "Success",
              message: "Removed",
            });
          }
        } catch (error) {
          showFailureToast(error);
        }
      }}
    ></Action>
  );
}
