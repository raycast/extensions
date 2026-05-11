import { useFetch } from "@raycast/utils";
import { stripFrontmatter, stripTemplateTags, formatTables } from "../utils";
import { GITHUB_RAW_URL } from "../constants";

export function useGetSheet(slug: string) {
  const url = `${GITHUB_RAW_URL}/${slug}.md`;

  const { isLoading, data, error } = useFetch(url, {
    parseResponse: async (response) => {
      return response.text();
    },
    mapResult(result: string) {
      const processedMarkdown = formatTables(stripTemplateTags(stripFrontmatter(result)));
      const title = slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      return {
        data: `# ${title}\n\n${processedMarkdown}`,
      };
    },
  });

  return {
    isLoading,
    data: data ?? "",
    error,
  };
}
