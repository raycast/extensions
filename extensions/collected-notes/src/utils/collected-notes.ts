import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

/**
 * An unique identifier of an item inside the Collected Notes API.
 * @export
 */
export type ID = number;

/**
 * A string containing Markdown, with optional FrontMatter at the beginning.
 * @export
 */
export type Markdown = string;

/**
 * A string containing HTML
 * @export
 */
export type HTML = string;

/**
 * A string containing XML
 * @export
 */
export type XML = string;

/**
 * A valid URL string.
 * @export
 */
export type URL = string;

/**
 * A valid email address string.
 * @export
 */
export type Email = string;

/**
 * An ISO-8601 date as a string.
 * @export
 */
export type ISODate = string;

/**
 * The posible visibility of a note.
 *
 * A `private` note is only visible for the author when it's logged-in inside
 * Collected Noted
 *
 * A `public` note is visible to everyone and appears on your Collected Noted
 * site.
 *
 * A `public_unlisted` note is not listed on your Collected Noted site but it
 * can be accessed by anyone with the link.
 *
 * A `site_public` is only visible through the API when a custom domain is set.
 * This notes will not appear on your Collected Noted site.
 * This visibility
 * option is only available when your site has a custom domain.
 * @export
 */
export type NoteVisibility = "private" | "public" | "public_unlisted" | "public_site";

/**
 * The format a note can come in.
 * @export
 */
export type NoteFormat = "md" | "txt" | "json";

/**
 * The format an RSS can come in.
 * @export
 */
export type FeedFormat = "xml" | "json";

export type JSONFeed = {
  /**
   * Is the URL of the version of the format the feed uses. This should appear
   * at the very top, though we recognize that not all JSON generators allow
   * for ordering.
   */
  version: string;
  /**
   * Is the name of the feed, which will often correspond to the name of the
   * website (blog, for instance), though not necessarily.
   */
  title: string;
  /**
   * Is the URL of the resource that the feed describes. This resource may or
   * may not actually be a “home” page, but it should be an HTML page. If a
   * feed is published on the public web, this should be considered as
   * required. But it may not make sense in the case of a file created on a
   * desktop computer, when that file is not shared or is shared only privately.
   */
  home_page_url?: string;
  /**
   * Is the URL of the feed, and serves as the unique identifier for the feed.
   * As with home_page_url, this should be considered required for feeds on the
   * public web.
   */
  feed_url?: string;
  /**
   * Provides more detail, beyond the title, on what the feed is about. A feed
   * reader may display this text.
   */
  description?: string;
  /**
   * Specifies the feed author. The author object has several members. These
   * are all optional — but if you provide an author object, then at least one
   * is required.
   */
  author?: {
    /**
     * The author’s name
     */
    name?: string;
    /**
     * Is the URL for an image for the author. As with icon, it should be
     * square and relatively large — such as 512 x 512 — and should use
     * transparency where appropriate, since it may be rendered on a non-white
     * background.
     */
    avatar?: string;
  };
  items: Array<{
    /**
     * Is unique for that item for that feed over time. If an item is ever
     * updated, the id should be unchanged. New items should never use a
     * previously-used id. If an id is presented as a number or other type, a
     * JSON Feed reader must coerce it to a string. Ideally, the id is the full
     * URL of the resource described by the item, since URLs make great unique
     * identifiers
     */
    id: string;
    /**
     * Is the URL of the resource described by the item. It’s the permalink.
     * This may be the same as the id — but should be present regardless.
     */
    url?: string;
    /**
     * Is plain text. Microblog items in particular may omit titles
     */
    title?: string;
    /**
     * A Twitter-like service might use content_text, while a blog might use
     * content_html. Use whichever makes sense for your resource. (It doesn’t
     * even have to be the same for each item in a feed.)
     */
    content_text?: string;
    /**
     * This is the HTML of the item. Important: the only place
     * HTML is allowed in this format is in content_html.
     */
    content_html?: string;
    /**
     * Is a plain text sentence or two describing the item. This might be
     * prsented in a timeline, for instance, where a detail view would display
     * all of content_html or content_text.
     */
    summary?: string;
    /**
     * Is the URL of the main image for the item. This image may also appear in
     * the content_html — if so, it’s a hint to the feed reader that this is
     * the main, featured image. Feed readers may use the image as a preview
     * (probably resized as a thumbnail and placed in a timeline).
     */
    image?: string;
    /**
     * specifies the date in RFC 3339 format. (Example:
     * 2010-02-07T14:04:00-05:00.)
     */
    date_published?: string;
    /**
     * Specifies the modification date in RFC 3339 format.
     */
    date_modified?: string;
  }>;
};

export type FeedOptions = {
  homePageUrl: string;
  feedUrl: string;
};

/**
 * A note inside Collected Notes.
 *
 * A note is what other platforms call an article or post.
 *
 * It has an author (`user_id`) and belongs to a site (`site_id`) and a `body`
 * with the content of the note.
 * @export
 */
export type Note = {
  /**
   * The ID of the note itself.
   * @type {ID}
   */
  id: ID;
  /**
   * The ID of the site the note belongs to.
   * @type {ID}
   */
  site_id: ID;
  /**
   * The path of the site the note belongs to.
   * @type {string}
   */
  site_path: string;
  /**
   * The ID of the user who wrote the note.
   * @type {ID}
   */
  user_id: ID;
  /**
   * The body of the note, with the content in Markdown.
   * @type {string}
   */
  body: Markdown;
  /**
   * The path of the note (e.g. `api`)
   * @type {string}
   */
  path: string;
  /**
   * The headline of the note, extracted from the first characters of the body.
   *
   * @type {string}
   */
  headline: string;
  /**
   * The title of the note, extracted from the first line of the body when prepended with `#`.
   * @type {string}
   */
  title: string;
  /**
   * The creation date of the note.
   * @type {ISODate} - The date in ISO-8601
   */
  created_at: ISODate;
  /**
   * The date of the last update of the note.
   * @type {ISODate} - The date in ISO-8601
   */
  updated_at: ISODate;
  /**
   * The visibility of the note, it could be `private`, `public`, or `public_unlisted`, or `public_site`.
   * @type {NoteVisibility}
   */
  visibility: NoteVisibility;
  /**
   * The full URL of the note, using the Collected Notes domain.
   * @type {string}
   */
  url: URL;
  /**
   * The first image used inside the note.
   * @type {(string | null)}
   */
  poster: string | null;
  /**
   * If the Note was curated by the [@CuratedNotes](https://twitter.com/CuratedNotes) Twitter account.
   * @type {boolean}
   */
  curated: boolean;
  /**
   * The order of the note.
   * @type {number}
   */
  ordering: number;
};

/**
 * A site inside Collected Notes.
 *
 * Sites belong to users, but a user can have more than one site.
 *
 * A site is where all notes written by a user are grouped.
 * @export
 */
export type Site = {
  /**
   *The ID of the site itself.
   * @type {ID}
   */
  id: ID;
  /**
   * The ID of the user who owns the site
   * @type {ID}
   */
  user_id: ID;
  /**
   * The name of the site.
   * @type {string}
   */
  name: string;
  /**
   * The headline (description) of the site.
   * @type {string}
   */
  headline: string;
  about: string;
  host: string | null;
  /**
   * The creation date of the site.
   * @type {ISODate} - The date in ISO-8601
   */
  created_at: ISODate;
  /**
   * The date of the last update of the site.
   * @type {ISODate} - The date in ISO-8601
   */
  updated_at: ISODate;
  /**
   * The path of the site (e.g. `blog`)
   * @type {string}
   */
  site_path: string;
  /**
   * If the site is published or not
   * @type {boolean}
   */
  published: boolean;
  /**
   * The TinyLetter username used for the integration.
   * @type {string}
   */
  tinyletter: string;
  /**
   * The custom domain the site runs on.
   *
   * @type {string}
   */
  domain: string;
  /**
   * The webhook URL configured to receive events from Collected Notes.
   * @type {string}
   */
  webhook_url: URL;
  /**
   * The payment platform used.
   * @type {(string | null)}
   */
  payment_platform: string | null;
  /**
   * If the site is on a premium plan.
   * @type {boolean}
   */
  is_premium: boolean;
  /**
   * The total number of **public** notes on the site.
   * @type {number}
   */
  total_notes: number;
};

export type User = {
  /**
   * The ID of the user itself.
   * @type {ID}
   */
  id: ID;
  /**
   * The email address of the user.
   * @type {string}
   */
  email: Email;
  /**
   * The name of the user.
   * @type {string}
   */
  name: string;
  /**
   * The role of the user inside the platform.
   * @type {string}
   */
  role: string;
  /**
   * If the user is banned.
   * @type {boolean}
   */
  banned: boolean;
  /**
   * The avatar URL of the user.
   *
   * @type {string}
   */
  avatar_key: URL;
  /**
   * The creation date of the user.
   * @type {ISODate} - The date in ISO-8601
   */
  created_at: ISODate;
  /**
   * The date of the last update of the user.
   * @type {ISODate} - The date in ISO-8601
   */
  updated_at: ISODate;
};

export type EventNoteUpdated = {
  event: "note-updated";
  data: { note: Note };
};
export type EventNoteCreated = {
  event: "note-created";
  data: { note: Note };
};
export type EventNoteDeleted = {
  event: "note-deleted";
  data: { note: Note };
};
export type EventNotesReordered = {
  event: "note-reordered";
  data: { notes: Note[] };
};

export type Event = EventNoteUpdated | EventNoteCreated | EventNoteDeleted | EventNotesReordered;

/**
 * A link detected by Collected Notes in the body of a note.
 *
 * They are differentiated based on the domain if they are internal or external.
 *
 * A link is marked as internal when the domain is Collected Notes and as an
 * external link when the domain is outside Collected Notes.
 */
export type Link = {
  /**
   * The unique identified of the link.
   * @type {ID}
   */
  id: ID;
  /**
   * The ID of the note the link belongs to.
   * @type {ID}
   */
  note_id: ID;
  /**
   * The full URL of the link.
   * @type {URL}
   */
  url: URL;
  /**
   * The kind of link.
   * A link is marked as internal when the domain is Collected Notes and as an
   * external link when the domain is outside Collected Notes.
   * @type {('internal' | 'external')}
   */
  kind: "internal" | "external";
  /**
   * The host (domain) of the link, this is used in the Collected Notes website
   * to highlight it from the rest of the URL.
   *
   * @type {string}
   */
  host: string;
  /**
   * The title of the note, in Markdown the title is defined as:
   *   `[text with link](url "title")`
   * Note how the linked text is not the same as the title.
   * This will be an empty string if the title is not defined.
   * @type {string}
   */
  title: string;
  /**
   * The creation date of the link.
   * @type {ISODate} - The date in ISO-8601
   */
  created_at: ISODate;
  /**
   * The date of the last update of the link.
   * @type {ISODate} - The date in ISO-8601
   */
  updated_at: ISODate;
};

const basicHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

/**
 * Create a new client of the API to consume the private endpoints.
 *
 * This can only be used when you have a Premium account.
 * Subscribe to Collected Notes on https://collectednotes.com/accounts/me/subscription.
 *
 * @export
 * @function
 * @param {Email} email - The string you use to login in Collected Notes
 * @param {string} token - Your API token, you can get it in https://collectednotes.com/accounts/me/token
 * @returns
 */
export function collectedNotes(email: Email, token: string) {
  const headers = {
    Authorization: `${email} ${token}`,
    ...basicHeaders,
  };

  /**
   * Get the latest notes of a Collected Notes site.
   *
   * The notes returned by this method includes the private and unlisted notes.
   * To get only the public notes you can use the `site` method.
   * _This API is paginated._
   *
   * @function
   * @async
   * @param {string} sitePath - The path of the site (e.g. `blog`)
   * @param {number} [page=1] - The page of the results, by default is `1`
   * @param {NoteVisibility} [visibility] - The page of the results, by default is `1`
   * @returns {Promise<Note[]>} - The list of notes
   */
  async function latestNotes(sitePath: string, page: number = 1, visibility?: NoteVisibility): Promise<Note[]> {
    const url = visibility
      ? `https://collectednotes.com/sites/${sitePath}/notes?page=${page}&visibility=${visibility}`
      : `https://collectednotes.com/sites/${sitePath}/notes?page=${page}`;

    const response = await fetch(url, { headers });
    return (await response.json()) as Note[];
  }

  /**
   * Get the list of sites of the user.
   *
   * @function
   * @async
   * @returns {Promise<Site[]>} - The list of sites
   */
  async function sites(): Promise<Site[]> {
    const response = await fetch("https://collectednotes.com/sites", {
      headers,
    });

    if (response.status === 401) throw new Error("Invalid credentials");

    return (await response.json()) as Site[];
  }

  /**
   * Create a new note with the given body and visibility.
   *
   * @function
   * @async
   * @param {{ body: string; visibility: NoteVisibility }} note - The body and visibility of the new note
   * @param {number} [siteId] - The if of the site (e.g. `1`), if not specified the note will be automatically added to the first site you have configured
   * @returns {Promise<Note>} - The newly created note
   */
  async function create(
    note: {
      body: string;
      visibility: NoteVisibility;
    },
    siteId?: number,
  ): Promise<Note> {
    const { body, visibility } = note;
    const url = siteId ? `https://collectednotes.com/sites/${siteId}/notes` : "https://collectednotes.com/notes/add";

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        note: {
          body,
          visibility,
        },
      }),
    });

    return (await response.json()) as Note;
  }

  /**
   * Update the body and visibility of a note.
   * Always pass the body and visibility, even if you are changing only one of
   * them.
   *
   * @function
   * @async
   * @param {string} sitePath - The path of the site (e.g.`blog`)
   * @param {string} notePath - The path of the note (e.g. `api`)
   * @param {{ body: string; visibility: NoteVisibility }} note - The new body and visibility of the note
   * @returns {Promise<Note>} - The updated note data
   */
  async function update(
    sitePath: string,
    notePath: string,
    note: {
      body: string;
      visibility: NoteVisibility;
    },
  ): Promise<Note> {
    const { body, visibility } = note;
    const response = await fetch(`https://collectednotes.com/sites/${sitePath}/notes/${notePath}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        note: {
          body,
          visibility,
        },
      }),
    });
    return (await response.json()) as Note;
  }

  /**
   * Delete a note, permanently.
   *
   * @function
   * @async
   * @param {string} sitePath - The path of the site (e.g. `blog`)
   * @param {string} notePath - The path of the note (e.g. `api`)
   * @returns {Promise<void>} - This method returns nothing
   */
  async function destroy(sitePath: string, notePath: string): Promise<void> {
    await fetch(`https://collectednotes.com/sites/${sitePath}/notes/${notePath}`, {
      headers,
      method: "DELETE",
    });
  }

  /**
   * Get the info of the currently logged-in user, based on the credentials.
   *
   * @function
   * @async
   * @returns {Promise<User>} - The user information
   */
  async function me(): Promise<User> {
    const response = await fetch("https://collectednotes.com/accounts/me", {
      headers,
    });
    return (await response.json()) as User;
  }

  /**
   * Reorder the notes of the site.
   *
   * @function
   * @async
   * @param {string} sitePath - The path of the site (e.g. `blog`)
   * @param {ID[]} noteIdList - The sorted ids of the notes
   * @returns {Promise<number[]>} - The final sorted ids as stored in Collected Notes
   */
  async function reorder(sitePath: string, noteIdList: ID[]): Promise<number[]> {
    const response = await fetch(`https://collectednotes.com/sites/${sitePath}/notes/reorder`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ids: noteIdList,
      }),
    });
    return (await response.json()) as number[];
  }

  /**
   * Search notes for a website. When using the `visibility` option it will only
   * search within your notes with the specified visibility, when it's not
   * defined it will search within all your notes.
   * _This API is paginated._
   *
   * @function
   * @async
   * @param {string} sitePath - The path of the site (e.g. `blog`)
   * @param {string} term - The search term, it will be encoded as a valid URI
   * @param {number} [page=1] - The page of the results, by default is `1`
   * @param {NoteVisibility} [visibility] - The visibility of the notes your are trying to search for
   * @returns {Promise<Note[]>} - The list of notes matching the search term
   */
  async function search(
    sitePath: string,
    term: string,
    page: number = 1,
    visibility?: NoteVisibility,
  ): Promise<Note[]> {
    const encodedTerm = encodeURI(term);
    const url = visibility
      ? `https://collectednotes.com/sites/${sitePath}/notes/search?term=${encodedTerm}&page=${page}&visibility=${visibility}`
      : `https://collectednotes.com/sites/${sitePath}/notes/search?term=${encodedTerm}&page=${page}`;

    const response = await fetch(url, {
      method: "GET",
      headers,
    });
    return (await response.json()) as Note[];
  }

  /**
   * Get a note with the body rendered as HTML.
   *
   * @function
   * @async
   * @param {string} sitePath - The path of the site (e.g. `blog`)
   * @param {string} notePath - The path of the note (e.g. `api`)
   * @returns {Promise<{ note:Note, body:HTML }>} - The note together with the HTML already parsed
   */
  async function body(
    sitePath: string,
    notePath: string,
  ): Promise<{
    note: Note;
    body: HTML;
  }> {
    const response = await fetch(`https://collectednotes.com/${sitePath}/${notePath}/body`, {
      method: "GET",
      headers,
    });
    return (await response.json()) as { note: Note; body: HTML };
  }

  /**
   * Get the list of links that are contained in a note.
   *
   * @function
   * @async
   * @param {string} sitePath - The path of the site (e.g. `blog`)
   * @param {string} notePath - The path of the note (e.g. `api`)
   * @param {('json' | 'html')} [format='json'] - The format you want to get the notes
   * @returns {Promise<Link[] | HTML>}
   */
  async function links(sitePath: string, notePath: string, format?: "json"): Promise<Link[]>;
  async function links(sitePath: string, notePath: string, format: "html"): Promise<HTML>;
  async function links(sitePath: string, notePath: string, format: "json" | "html" = "json"): Promise<Link[] | HTML> {
    const response = await fetch(
      `https://collectednotes.com/sites/${sitePath}/notes/${notePath}/links${format === "json" ? ".json" : ""}`,
      {
        method: "GET",
        headers,
      },
    );
    return (await response.json()) as Link[] | HTML;
  }

  /**
   * Get the data of a site and their public notes.
   * This method is public and doesn't require authentication.
   * _This API is paginated._
   *
   * @function
   * @async
   * @param {string} sitePath - The path of the site (e.g. `blog`)
   * @param {number} [page=1] - The page of the results, by default is `1`
   * @param {NoteVisibility} [visibility] - The visibility of the notes you are trying to fetch.
   * @returns {Promise<{ site: Site; notes: Note[] }>} - An object with the site and the list of notes
   */
  async function site(
    sitePath: string,
    page: number = 1,
    visibility?: NoteVisibility,
  ): Promise<{
    site: Site;
    notes: Note[];
  }> {
    const url = visibility
      ? `https://collectednotes.com/${sitePath}.json?page=${page}&visibility=${visibility}`
      : `https://collectednotes.com/${sitePath}.json?page=${page}`;
    const response = await fetch(url, {
      method: "GET",
      headers,
    });
    return (await response.json()) as { site: Site; notes: Note[] };
  }

  /**
   *
   * @param {string} sitePath - The path of the site (e.g. `blog`)
   * @param {NoteVisibility} [visibility] - The visibility of the notes you are
   * @param {Pick<JSONFeed, 'home_page_url' | 'feed_url'>} feedOptions - Extra information required to build the feed
   * @param {('json' | 'xml')} [format='json'] - The format you want to get the feed
   */
  async function feed(
    sitePath: string,
    visibility: NoteVisibility,
    feedOptions: Pick<JSONFeed, "home_page_url" | "feed_url">,
    format: "json",
  ): Promise<JSONFeed>;
  async function feed(
    sitePath: string,
    visibility: NoteVisibility,
    feedOptions: Pick<JSONFeed, "home_page_url" | "feed_url">,
    format: "xml",
  ): Promise<XML>;
  async function feed(
    sitePath: string,
    visibility: NoteVisibility,
    feedOptions: Pick<JSONFeed, "home_page_url" | "feed_url">,
    format: FeedFormat = "json",
  ): Promise<JSONFeed | XML> {
    const [{ notes, site: siteInfo }, user] = await Promise.all([site(sitePath, 1, visibility), me()]);

    const noteBodies = await Promise.all(notes.map((note) => body(sitePath, note.path)));

    const feed: JSONFeed = {
      version: "https://jsonfeed.org/version/1",
      title: siteInfo.name,
      ...feedOptions,
      author: {
        name: user.name,
        avatar: user.avatar_key,
      },
      items: noteBodies.map(({ note, body }) => {
        const url = new URL(note.path, feedOptions.home_page_url);
        return {
          id: note.id.toString(),
          url: url.toString(),
          title: note.title,
          content_text: note.body,
          content_html: body,
          date_published: note.created_at,
          date_modified: note.updated_at,
          image: note.poster ?? undefined,
          summary: note.headline,
        };
      }),
    };

    if (format === "json") return feed;

    return `
    <?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0">
      <channel>
        <title>${siteInfo.name}</title>
        <description>${siteInfo.headline}</description>
        <link>${feedOptions.home_page_url}</link>
        <lastBuildDate>${new Date().toString()}</lastBuildDate>
        <pubDate>${new Date().toString()}</pubDate>
        ${feed.items.map((item) => {
          return `
            <item>
              <title>${item.title}</title>
              <link>${item.url}</link>
              <pubDate>${item.date_published}</pubDate>
              <description>${item.summary}</description>
            </item>
          `;
        })}
      </channel>
    </rss>
    `;
  }

  return {
    latestNotes,
    sites,
    site,
    create,
    read,
    update,
    destroy,
    me,
    reorder,
    search,
    body,
    links,
    feed,
  } as const;
}

/**
 * Get the data of a site and their public notes.
 * This method is public and doesn't require authentication.
 * _This API is paginated._
 *
 * @export
 * @function
 * @async
 * @param {string} sitePath - The path of the site (e.g. `blog`)
 * @param {number} [page=1] - The page of the results, by default is `1`
 * @returns {Promise<{ site: Site; notes: Note[] }>} - An object with the site and the list of notes
 */
export async function site(sitePath: string, page: number = 1): Promise<{ site: Site; notes: Note[] }> {
  const url = `https://collectednotes.com/${sitePath}.json?page=${page}`;
  const response = await fetch(url, { headers: basicHeaders });
  return (await response.json()) as { site: Site; notes: Note[] };
}

/**
 * Get a note based using the site and note path.
 * This method is public and doesn't require authentication.
 *
 * This method allow you to get a note as plain text, plain Markdown or JSON.
 *
 * @export
 * @function
 * @async
 * @param {string} sitePath - The path of the site (e.g. `blog`)
 * @param {string} notePath - The path of the note (e.g. `api`)
 * @param {'json' | 'md' | 'txt'} [format="json"] - The format you expected the note
 * @returns {Promise<Note | string | Markdown>} - The note, in the format specified in the params
 */
export async function read(sitePath: string, notePath: string, format?: "json"): Promise<Note>;
export async function read(sitePath: string, notePath: string, format: "md"): Promise<Markdown>;
export async function read(sitePath: string, notePath: string, format: "txt"): Promise<string>;
export async function read(
  sitePath: string,
  notePath: string,
  format: NoteFormat = "json",
): Promise<Note | string | Markdown> {
  switch (format) {
    case "json": {
      const response = await fetch(`https://collectednotes.com/${sitePath}/${notePath}.json`);
      return (await response.json()) as Note;
    }
    case "md": {
      const response = await fetch(`https://collectednotes.com/${sitePath}/${notePath}.md`);
      return await response.text();
    }
    case "txt": {
      const response = await fetch(`https://collectednotes.com/${sitePath}/${notePath}.text`);
      return await response.text();
    }
  }
}

/**
 * Get a note with the body rendered as HTML.
 *
 * @export
 * @function
 * @async
 * @param {string} sitePath - The path of the site (e.g. `blog`)
 * @param {string} notePath - The path of the note (e.g. `api`)
 * @returns {Promise<{ note:Note, body:HTML }>} - The note together with the HTML already parsed
 */
export async function body(sitePath: string, notePath: string): Promise<{ note: Note; body: HTML }> {
  const response = await fetch(`https://collectednotes.com/${sitePath}/${notePath}/body`, { headers: basicHeaders });
  return (await response.json()) as { note: Note; body: HTML };
}

export const cn = collectedNotes(getPreferenceValues().email, getPreferenceValues().apiKey);
