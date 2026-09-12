import { LaunchProps, open, showToast, Toast } from "@raycast/api";

type SearchType = "artist" | "release" | "genre";

export default async function SearchRateYourMusic(props: LaunchProps<{ arguments: Arguments.RymSearch }>) {
  const { query, category: selectedType } = props.arguments;

  const constructBaseURL = (baseUrl: string, query: string): string =>
    `${baseUrl}/search?searchterm=${encodeURIComponent(query)}`;

  const appendSearchType = (url: string, type: SearchType | null, baseUrl: string): string => {
    const searchParams = {
      artist: "&searchtype=a",
      release: "&searchtype=l",
      genre: (query: string) => `/genre/${encodeURIComponent(query)}`,
    };

    if (type && type in searchParams) {
      return type === "genre" ? `${baseUrl}${searchParams[type](query)}` : `${url}${searchParams[type]}`;
    }
    return url;
  };

  async function handleSearch() {
    const baseUrl = "https://rateyourmusic.com";
    let url = constructBaseURL(baseUrl, query);
    url = appendSearchType(url, selectedType, baseUrl);

    try {
      await open(url);
    } catch (error) {
      showToast(Toast.Style.Failure, "Error during search", error instanceof Error ? error.message : String(error));
    }
  }

  await handleSearch();
}
