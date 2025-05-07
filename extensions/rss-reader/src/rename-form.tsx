import { ActionPanel, Form, showToast, Icon, useNavigation, Action, LocalStorage, Toast } from "@raycast/api";
import { Feed } from "./feeds";
import { FormValidation, useForm } from "@raycast/utils";

function RenameFeedForm({ feed, feeds, onRename }: { feed: Feed; feeds: Feed[]; onRename: () => void }) {
  const navigation = useNavigation();

  const { itemProps, handleSubmit, setValue } = useForm<Feed>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Renaming Feed", `${feed.title} -> ${values.title}`);
      const index = feeds.findIndex((f) => f.url === feed.url);
      feeds[index] = { ...feed, title: values.title, originalTitle: feed.originalTitle ?? feed.title };
      await LocalStorage.setItem("feeds", JSON.stringify(feeds));
      toast.style = Toast.Style.Success;
      toast.title = "Renamed Feed";
      onRename();
      navigation.pop();
    },
    initialValues: {
      title: feed.title,
    },
    validation: {
      title: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename" onSubmit={handleSubmit} icon={Icon.Pencil} />
          <Action
            icon={Icon.Replace}
            title="Restore Original Title"
            onAction={() => setValue("title", feed.originalTitle ?? feed.title)}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="RSS Feed URL" text={feed.url} />
      <Form.TextField title="Title" placeholder={feed.title} {...itemProps.title} />
    </Form>
  );
}

export default RenameFeedForm;
