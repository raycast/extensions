import { Form, ActionPanel, Action, showToast, getPreferenceValues, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { addBookmark, login } from "./api.js";

interface AddBookmarkFormValues {
  url: string;
}

// get preferences and polish hostUrl
const getGoodPreferences = (): Preferences => {
  const { username, password } = getPreferenceValues<Preferences>();
  let { hostUrl } = getPreferenceValues<Preferences>();

  if (!hostUrl.startsWith("https://") && !hostUrl.startsWith("http://")) {
    hostUrl = `https://${hostUrl}`;
  }
  if (!hostUrl.endsWith("/")) {
    hostUrl = `${hostUrl}/`;
  }

  return {
    hostUrl,
    username,
    password,
  };
};

export default function Command() {
  const { handleSubmit, itemProps, reset } = useForm<AddBookmarkFormValues>({
    onSubmit: async (values) => {
      const { hostUrl, username, password } = getGoodPreferences();
      const apiEndpoint = `${hostUrl}api`;

      // TODO: migrate to API v1 after released
      // TODO: cache session token and login only necessary

      let session;
      try {
        session = await login(apiEndpoint, username, password);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to log into Shiori",
        });
        return;
      }

      try {
        // polish url - protocol is required (at least in API pre-v1)
        let bookmarkUrl = values.url;
        if (!bookmarkUrl.startsWith("https://") && !bookmarkUrl.startsWith("http://")) {
          bookmarkUrl = `https://${bookmarkUrl}`;
        }

        const bookmarkId = await addBookmark(apiEndpoint, session, bookmarkUrl);
        await showToast({
          style: Toast.Style.Success,
          title: "Bookmark created with id " + bookmarkId,
        });

        reset();
      } catch (error) {
        console.log(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to add bookmark",
        });
      }
    },
    validation: {
      url: FormValidation.Required,
    },
  });

  return (
    <Form
      searchBarAccessory={
        <Form.LinkAccessory
          target="https://github.com/go-shiori/shiori/blob/master/docs/API.md"
          text="About Shioro API"
        />
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="URL to Bookmark" {...itemProps.url} />

      {/* TODO tags input */}
    </Form>
  );
}
