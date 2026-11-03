import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { PostFeedList } from "./components/post-feed-list";
import { advancedFeed, AdvancedSearchValues } from "./lib/feeds";

const MEDIA_OPTIONS = [
  { title: "Any", value: "" },
  { title: "Images", value: "images" },
  { title: "Videos", value: "videos" },
  { title: "GIFs", value: "gifs" },
  { title: "Any Media", value: "media" },
  { title: "Links", value: "links" },
  { title: "No Media", value: "none" },
];

const SORT_OPTIONS = ["Latest", "Top"];

const wholeNumber = (value?: string) => (!value || /^\d+$/.test(value.trim()) ? undefined : "Enter a whole number.");

export default function Command() {
  const { push } = useNavigation();
  const { handleSubmit, itemProps } = useForm<AdvancedSearchValues>({
    initialValues: {
      query: "",
      from: "",
      mentioning: "",
      language: "",
      since: null,
      until: null,
      minLikes: "",
      minReposts: "",
      media: "",
      sort: "Latest",
      excludeReplies: false,
    },
    validation: { minLikes: wholeNumber, minReposts: wholeNumber },
    onSubmit(values) {
      const feed = advancedFeed(values);
      if (feed) {
        push(<PostFeedList feed={feed} navigationTitle="Search Results" />);
        return;
      }
      showToast({ style: Toast.Style.Failure, title: "Add a Search Term", message: "Fill in at least 1 field." });
      return false;
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Query" placeholder="Words or X Operators" {...itemProps.query} />
      <Form.TextField title="From" placeholder="Username" {...itemProps.from} />
      <Form.TextField title="Mentioning" placeholder="Username" {...itemProps.mentioning} />
      <Form.TextField title="Language" placeholder="Language Code" {...itemProps.language} />
      <Form.DatePicker title="Since" type={Form.DatePicker.Type.Date} {...itemProps.since} />
      <Form.DatePicker title="Until" type={Form.DatePicker.Type.Date} {...itemProps.until} />
      <Form.TextField title="Minimum Likes" placeholder="0" {...itemProps.minLikes} />
      <Form.TextField title="Minimum Reposts" placeholder="0" {...itemProps.minReposts} />
      <Form.Dropdown title="Media" {...itemProps.media}>
        {MEDIA_OPTIONS.map(({ title, value }) => (
          <Form.Dropdown.Item key={title} title={title} value={value} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Sort" {...itemProps.sort}>
        {SORT_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option} title={option} value={option} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox label="Exclude Replies" {...itemProps.excludeReplies} />
    </Form>
  );
}
