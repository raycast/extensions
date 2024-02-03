import got from 'got';
import { Form, ActionPanel, Action, showToast, getPreferenceValues, Toast } from "@raycast/api";

interface Preferences {
  hostUrl: string;
  username: string;
  password: string;
}

type FormValues = {
  url: string;
};

export default function Command() {

  // https://github.com/go-shiori/shiori/blob/master/docs/API.md#log-in
  async function login(
    apiEndpoint: string,
    username: string,
    password: string
  ): Promise<string> {
    const apiUrl = `${apiEndpoint}/login`;
    const { body } = await got.post(apiUrl, {
      json: {
        username,
        password
      },
      responseType: "json",
    }) as {
      body: {
        session: string;
        account: {
          id: number;
          username: string;
          owner: boolean;
        }
      }
    };

    return body.session;
  }

  // https://github.com/go-shiori/shiori/blob/master/docs/API.md#add-bookmark
  // 
  // sample request
  // {
  //   "url": "https://interesting_cool_article.com",
  //   "createArchive": true,
  //   "public": 1,
  //   "tags": [{"name": "Interesting"}, {"name": "Cool"}],
  //   "title": "Cool Interesting Article",
  //   "excerpt": "An interesting and cool article indeed!"
  // }
  // 
  // sample response
  //   {
  //     "id": 827,
  //     "url": "https://interesting_cool_article.com",
  //     "title": "TITLE",
  //     "excerpt": "EXCERPT",
  //     "author": "AUTHOR",
  //     "public": 1,
  //     "modified": "DATE",
  //     "html": "HTML",
  //     "imageURL": "/bookmark/827/thumb",
  //     "hasContent": false,
  //     "hasArchive": true,
  //     "tags": [
  //         {
  //              "name": "Interesting"
  //         },
  //         {
  //              "name": "Cool"
  //         }
  //     ],
  //     "createArchive": true
  // }
  async function addBookmark(
    apiEndpoint: string,
    session: string,
    url: string,
    // tags: string[]
  ): Promise<number> {
    const apiUrl = `${apiEndpoint}/bookmarks`;
    console.log("addBookmark: " + apiUrl + " " + session + "; " + url)
    const { body } = await got.post(apiUrl, {
      headers: {
        "X-Session-Id": session,
      },
      json: {
        url,
        // tags: tags.map((tag) => ({ name: tag })),
      },
      responseType: "json",
    }) as {
      body: {
        id: number;
      }
    };
    return body.id;
  }

  async function handleSubmit(values: FormValues) {
    const { username, password } = getPreferenceValues<Preferences>();
    let { hostUrl } = getPreferenceValues<Preferences>();

    if (!hostUrl.startsWith("https://") && !hostUrl.startsWith("http://")) {
      hostUrl = `https://${hostUrl}`;
    }
    if (!hostUrl.endsWith("/")) {
      hostUrl = `${hostUrl}/`;
    }

    const apiEndpoint = `${hostUrl}api`;

    // TODO: migrate to API v1 after released
    // TODO: cache session token and login only necessary

    let session
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
      let bookmarkUrl = values.url
      if (!bookmarkUrl.startsWith("https://") && !bookmarkUrl.startsWith("http://")) {
        bookmarkUrl = `https://${bookmarkUrl}`;
      }

      const bookmarkId = await addBookmark(apiEndpoint, session, bookmarkUrl);
      await showToast({
        style: Toast.Style.Success,
        title: "Bookmark created with id " + bookmarkId,
      });
    } catch (error) {
      console.log(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add bookmark",
      });
    }
  }

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
      {/* TODO validation */}
      <Form.TextField id="url" title="URL to bookmark" />

      {/* TODO tags input */}
    </Form>
  );
}
