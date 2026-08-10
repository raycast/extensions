import got from "got";

// https://github.com/go-shiori/shiori/blob/master/docs/API.md#log-in
export async function login(apiEndpoint: string, username: string, password: string): Promise<string> {
  const apiUrl = `${apiEndpoint}/login`;
  const { body } = (await got.post(apiUrl, {
    json: {
      username,
      password,
    },
    responseType: "json",
  })) as {
    body: {
      session: string;
      account: {
        id: number;
        username: string;
        owner: boolean;
      };
    };
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
export async function addBookmark(
  apiEndpoint: string,
  session: string,
  url: string,
  // tags: string[]
): Promise<number> {
  const apiUrl = `${apiEndpoint}/bookmarks`;
  console.log("addBookmark: " + apiUrl + " " + session + "; " + url);
  const { body } = (await got.post(apiUrl, {
    headers: {
      "X-Session-Id": session,
    },
    json: {
      url,
      // tags: tags.map((tag) => ({ name: tag })),
    },
    responseType: "json",
  })) as {
    body: {
      id: number;
    };
  };
  return body.id;
}
