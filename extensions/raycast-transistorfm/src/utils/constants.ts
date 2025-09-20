export const BASE_URL = "https://api.transistor.fm/v1";

export const ERROR_MAP = (error: string | Error) => {
  if (
    error.toString() === "Error: Unauthorized" ||
    error.toString() === "Error: Bad Request" ||
    error.toString() === "Error: Not Found"
  ) {
    return {
      title: "Missing or Invalid API Key",
      message: "Check that you entered the correct API key",
      content:
        "# Missing or Invalid API Key \n You've entered an invalid API key or didn't enter one at all. \n Follow the steps below to get the right API key: \n 1. Log into **TransistorFM** dashboard \n 2. Go to **Your Account** \n 3. Copy the API Key [there](https://dashboard.transistor.fm/account) \n 4. Add the API key to the extension settings by hitting `⌥` + `⌘` + `,` on your keyboard",
    };
  }

  if (error.toString() === "Error: Request Timeout") {
    return {
      title: "Request timed out",
      message: "The request took too long to respond",
      content:
        "# Request timed out \n The API may be seeing unexpected traffic or you may have entered an invalid API key. \n Follow the steps below, in case, you want to set the right API key: \n 1. Log into **TransistorFM** dashboard. \n 2. Go to **Your Account**. \n 3. Copy the API Key from [there](https://dashboard.transistor.fm/account). \n 4. Add the API key to the extension settings by hitting `⌥` + `⌘` + `,` on your keyboard.",
    };
  }

  if (error === "Error: Too Many Requests") {
    return {
      title: "Too many requests",
      message: "Wait a few minutes before trying to run the command again",
      content: `# Too many requests \n You've sent too many requests and reached the rate limit for the TransistorFM API. Wait a few minutes and try again in a bit.`,
    };
  }

  return {
    title: "Error",
    message: "Try again or refresh the command",
    content: `# Error \n Please try again later. If the issue persists, please [open an issue](https://github.com/raycast/extensions/issues/new?assignees=&labels=extension,bug&projects=&template=extension_bug_report.yml&title=%5BFathom+Analytics+Stats%5D+Your+title+here) on GitHub.`,
  };
};

export const SHOW_LABELS = {
  amazonMusic: "Amazon Music",
  applePodcasts: "Apple Podcasts",
  author: "Author",
  castro: "Castro",
  categories: "Categories",
  createdAt: "Created At",
  deezer: "Deezer",
  description: "Description",
  explicit: "Explicit",
  rssFeed: "RSS Feed",
  googlePodcasts: "Google Podcasts",
  keywords: "Keywords",
  language: "Explicit",
  multipleSeasons: "Multiple Seasons",
  pandora: "Pandora",
  pocketCasts: "Pocket Casts",
  private: "Visibility?",
  showType: "Show Type",
  spotify: "Spotify",
  title: "Title",
  website: "Website",
};

export const EPISODE_LABELS = {
  author: "Author",
  createdAt: "Created At",
  description: "Description",
  duration: "Duration",
  explicit: "Explicit",
  keywords: "Keywords",
  publishedAt: "Published At",
  number: "Number",
  season: "Season",
  shareUrl: "Share URL",
  status: "Status",
  transcriptUrl: "Transcript URL",
  type: "Type",
  title: "Title",
};
