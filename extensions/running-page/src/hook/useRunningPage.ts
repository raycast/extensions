import { getAccessToken, showFailureToast, useFetch } from "@raycast/utils";
import { Activity } from "../type";
import { sortDateFunc } from "../util/utils";

export function useRunningPage({ owner, repo, path }: { owner: string; repo: string; path: string }) {
  const { token } = getAccessToken();

  // https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28#get-repository-content
  const { isLoading, data, revalidate } = useFetch<Activity[]>(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
        // https://docs.github.com/en/rest/using-the-rest-api/getting-started-with-the-rest-api?apiVersion=2022-11-28#media-types
        Accept: "application/vnd.github.raw+json",
        Authorization: `Bearer ${token}`,
      },
      method: "GET",
      keepPreviousData: true,
      parseResponse: async (response) => {
        if (!response.ok) {
          console.log(response);
          if (response.status === 429) {
            throw new Error("Rate limit exceeded");
          }
          throw new Error("HTTP error " + response.status);
        }
        const json = await response.json();
        if ((json as Error).message) {
          throw new Error((json as Error).message);
        }
        return (json as Activity[]).sort(sortDateFunc);
      },
      onError: async (error) => {
        // console.error(error);
        await showFailureToast(error, { title: "Failed to fetch data" });
      },
    },
  );

  return { isLoading, data, revalidate };
}
