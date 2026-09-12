import { showToast, Toast, Form, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { CREATE_REVIEW } from "../mutations/createReview";
import { useMutation } from "@apollo/client";

interface CreateReviewProps {
  bookId: string;
  title: string;
}

interface FormValues {
  bookId: string;
  text: string;
  spoiler: boolean;
  rating: string;
  tags: string[];
}

const ratings = [
  { value: "1", title: "★" },
  { value: "2", title: "★★" },
  { value: "3", title: "★★★" },
  { value: "4", title: "★★★★" },
  { value: "5", title: "★★★★★" },
];

export default function CreateReview(props: CreateReviewProps) {
  const { bookId, title } = props;
  const { pop } = useNavigation();

  const [createReview] = useMutation(CREATE_REVIEW, {
    onCompleted: () => {
      showToast({
        style: Toast.Style.Success,
        title: "Successfully send",
      });
      pop();
    },
    onError: () => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to send review",
      });
    },
  });

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit(values) {
      createReview({
        variables: {
          bookId: bookId,
          text: values.text,
          spoiler: values.spoiler,
          rating: Number(values.rating),
          tags: [],
        },
      });
    },
    initialValues: {
      bookId: bookId,
      spoiler: false,
      rating: "3",
    },
  });

  return (
    <Form
      navigationTitle="Create Review"
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.ArrowRight} title="Submit Review" />
          <Action.OpenInBrowser url="https://literal.club" title="Open Literal" />
        </ActionPanel>
      }
    >
      <Form.Description title="Review" text={title} />
      <Form.TextArea {...itemProps.text} autoFocus placeholder="What do you think of the book?" />
      <Form.Dropdown title="Rating" {...itemProps.rating}>
        {ratings.map((item) => {
          return <Form.Dropdown.Item value={item.value} title={item.title} key={item.value} />;
        })}
      </Form.Dropdown>
      <Form.Checkbox {...itemProps.spoiler} label="This contains a spoiler" />
    </Form>
  );
}
