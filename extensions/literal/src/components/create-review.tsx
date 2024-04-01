import { showToast, Toast, Form, ActionPanel, Action, Icon, popToRoot } from "@raycast/api";
import Client from "../utils/client";
import { CREATE_REVIEW } from "../mutations/createReview";
import { useMutation } from "@apollo/client";
import { ApolloProvider } from "@apollo/client";

interface CreateReviewProps {
  bookId: string;
  title: string;
}

export default function CreateReview(props: CreateReviewProps) {
  const { bookId, title } = props;

  const [createReview] = useMutation(CREATE_REVIEW, {
    onCompleted: () => {
      showToast({
        style: Toast.Style.Success,
        title: "Successful",
      });
      popToRoot();
    },
    onError: () => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to send review",
      });
    },
  });

  return (
    <ApolloProvider client={Client}>
      <Form
        navigationTitle="Create Review"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              onSubmit={(values) => {
                createReview({
                  variables: {
                    bookId: bookId,
                    text: values.text,
                    spoiler: values.spoiler,
                    rating: Number(values.rating),
                    tags: [],
                  },
                });
              }}
              icon={Icon.ArrowRight}
              title="Submit Review"
            />
            <Action.OpenInBrowser url="https://literal.club" title="Open Literal" />
          </ActionPanel>
        }
      >
        <Form.Description title="Review" text={title} />
        <Form.TextArea id="text" autoFocus placeholder="What do you think of the book?" />
        <Form.Dropdown id="rating" title="Rating" defaultValue="3">
          <Form.Dropdown.Item value="1" title="★" />
          <Form.Dropdown.Item value="2" title="★★" />
          <Form.Dropdown.Item value="3" title="★★★" />
          <Form.Dropdown.Item value="4" title="★★★★" />
          <Form.Dropdown.Item value="5" title="★★★★★" />
        </Form.Dropdown>
        <Form.Checkbox id="spoiler" label="This contains a spoiler" defaultValue={false} />
      </Form>
    </ApolloProvider>
  );
}
