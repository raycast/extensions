import { useState } from "react";
import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { GET_BOOKS } from "../queries/getBooks";
import BookDetails from "../book-details";
import { UPDATE_STATUS } from "../mutations/updateStatus";
import CreateReview from "./create-review";
import { Book, ReadingState, Status } from "../types";
import _, { startCase } from "lodash";
import { useQuery, useMutation } from "@apollo/client";
import { ApolloProvider } from "@apollo/client";
import client from "../utils/client";
import { logout } from "../authContext";

interface ReadingStates {
  myReadingStates: ReadingState[];
}

const BookList: React.FC = () => {
  const { loading, data } = useQuery<ReadingStates>(GET_BOOKS, {
    onError: (error) => {
      if (error.graphQLErrors) {
        const graphqlError = error.graphQLErrors[0];
        showToast({
          style: Toast.Style.Failure,
          title: graphqlError.message,
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "An error occurred",
        });
      }
    },
  });

  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);

  const books = data?.myReadingStates || [];

  const filteredBooks = books.filter((shelf) => shelf.status === selectedStatus);

  const reversedFilteredBooks = filteredBooks.slice().reverse();

  const uniqueBooks = _.uniqWith(reversedFilteredBooks, _.isEqual);

  function StatusDropdown() {
    return (
      <List.Dropdown
        tooltip="Select Status"
        defaultValue={Status.Reading}
        storeValue
        onChange={(newValue) => setSelectedStatus(newValue as Status)}
      >
        {Object.entries(Status).map(([name, value]) => (
          <List.Dropdown.Item key={value} title={startCase(name)} value={value} />
        ))}
      </List.Dropdown>
    );
  }
  return (
    <List
      navigationTitle="Search Books"
      searchBarAccessory={<StatusDropdown />}
      searchBarPlaceholder="Search books..."
      isLoading={loading}
    >
      {uniqueBooks?.map((item, index) => <BookItem key={index} item={item.book} />)}
    </List>
  );
};

interface BookItemProps {
  item: Book;
}

const BookItem: React.FC<BookItemProps> = ({ item }) => {
  const { id, title, cover, authors, slug, isbn13 } = item;

  const [updateReadingStatus] = useMutation(UPDATE_STATUS, {
    onCompleted: () => {
      showToast({
        style: Toast.Style.Success,
        title: "Successfully updated",
      });
    },
    onError: () => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update book status",
      });
    },
    refetchQueries: [GET_BOOKS],
  });

  return (
    <List.Item
      title={title || "Book"}
      subtitle={authors[0]?.name || "Author"}
      id={slug}
      icon={cover ? { source: cover } : Icon.Book}
      actions={
        <ActionPanel title="Actions">
          <Action.Push
            icon={Icon.Window}
            title="Show Details"
            target={
              <ApolloProvider client={client}>
                <BookDetails id={id} isbn={isbn13} />
              </ApolloProvider>
            }
          />
          <Action.OpenInBrowser url={`https://literal.club/book/${slug}`} />
          <ActionPanel.Submenu
            icon={Icon.Book}
            title="Update Reading Status"
            shortcut={{ modifiers: ["cmd"], key: "u" }}
          >
            <Action
              icon={{ source: Icon.Circle, tintColor: Color.Green }}
              title="Finished"
              onAction={() =>
                updateReadingStatus({
                  variables: {
                    bookId: id,
                    readingStatus: "FINISHED",
                  },
                })
              }
            />
            <Action
              icon={{ source: Icon.Circle, tintColor: Color.Blue }}
              title="Reading"
              onAction={() =>
                updateReadingStatus({
                  variables: {
                    bookId: id,
                    readingStatus: "IS_READING",
                  },
                })
              }
            />
            <Action
              icon={{ source: Icon.Circle, tintColor: Color.Yellow }}
              title="Want to Read"
              onAction={() =>
                updateReadingStatus({
                  variables: {
                    bookId: id,
                    readingStatus: "WANTS_TO_READ",
                  },
                })
              }
            />
            <Action
              icon={{ source: Icon.Circle, tintColor: Color.Red }}
              title="Stopped Reading"
              onAction={() =>
                updateReadingStatus({
                  variables: {
                    bookId: id,
                    readingStatus: "DROPPED",
                  },
                })
              }
            />
          </ActionPanel.Submenu>
          <Action.Push
            icon={Icon.SpeechBubble}
            title="Create Review"
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            target={
              <ApolloProvider client={client}>
                <CreateReview title={title} bookId={id} />
              </ApolloProvider>
            }
          />
          <Action
            title="Logout"
            icon={{ source: Icon.Logout }}
            onAction={() => logout()}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
        </ActionPanel>
      }
    />
  );
};

export default BookList;
