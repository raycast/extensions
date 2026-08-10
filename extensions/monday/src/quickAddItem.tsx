import { Form, getPreferenceValues } from "@raycast/api";
import { getBoardAndUser } from "./lib/api";
import AddItem from "./addItem";
import { ErrorView } from "./lib/helpers";
import { useCachedPromise } from "@raycast/utils";

export default function QuickAddItem() {
  const { data: board, error } = useCachedPromise(async () => {
    const boardId =
      getPreferenceValues<Preferences.QuickAddItem>().quickAddBoardId;
    const response = await getBoardAndUser(+boardId);
    if (!response.boards.length) throw "Board not found";
    return response.boards[0];
  }, []);

  if (error) {
    return (
      <ErrorView
        error={`Sorry but we failed accessing the defined board. \n Inner error: ${error}`}
      />
    );
  } else if (board) {
    return <AddItem board={board} />;
  } else {
    return <Form isLoading={true}></Form>;
  }
}
