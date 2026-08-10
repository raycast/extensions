import { ActionPanel, List, Action, Icon, confirmAlert, showToast, Toast } from "@raycast/api";
import useMe from "./hooks/useMe";
import useListBooks from "./hooks/useListBooks";
import ListBooks from "./components/ListBooks";
import CreateListForm from "./components/CreateListForm";
import { deleteList } from "./api/lists";
import { showFailureToast } from "@raycast/utils";

export default function Command() {
  const { me, isMeLoading } = useMe();
  const { listBooks, isListBooksLoading, mutateListBooks } = useListBooks();

  return (
    <List isLoading={isListBooksLoading || isMeLoading} searchBarPlaceholder="Search lists">
      {listBooks?.map((list) => {
        return (
          <List.Item
            key={list.id}
            title={list.name}
            subtitle={`${list.books_count || 0} books`}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Books"
                  icon={Icon.Book}
                  target={<ListBooks listBooks={list.list_books} me={me} mutateList={mutateListBooks} />}
                />
                {me && (
                  <Action.OpenInBrowser
                    title="View on Hardcover"
                    url={`https://hardcover.app/@${me.username}/lists/${list.slug}`}
                  />
                )}
                <Action.Push
                  title="Create List"
                  icon={Icon.Pencil}
                  target={<CreateListForm mutateList={mutateListBooks} />}
                />
                <Action
                  title="Delete List"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Are you sure?",
                      })
                    ) {
                      try {
                        showToast({
                          style: Toast.Style.Animated,
                          title: "Deleting...",
                        });
                        await mutateListBooks(deleteList(list.id));
                        showToast({
                          style: Toast.Style.Success,
                          title: "Success",
                          message: `Deleted list "${list.name}"`,
                        });
                      } catch (error) {
                        showFailureToast(error);
                      }
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
