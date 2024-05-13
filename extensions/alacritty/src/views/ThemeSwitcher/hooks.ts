import { useCallback } from "react";
import { useStreamJSON } from "@raycast/utils";
import { getDisplayName } from "../../utils/theme-switcher";
import { ExternalTheme, GithubContentMeta } from "../../types/theme-switcher";
import { COLOR_SCHEME_IMAGES_BASE_URL, THEMES_CONTENT_URL } from "../../constants/theme-switcher";

export const useExternalThemes = (searchText: string) => {
  const filterThemes = useCallback(
    (item: ExternalTheme) => {
      if (!searchText) return true;
      return item.displayName.toLocaleLowerCase().includes(searchText);
    },
    [searchText]
  );

  const transformContentToTheme = useCallback((item: GithubContentMeta): ExternalTheme => {
    const filename = item.name.replace(".toml", "");

    return {
      filename,
      basename: item.name,
      displayName: getDisplayName(item.name),
      path: item.path,
      downloadUrl: item.download_url,
      imageUrl: `${COLOR_SCHEME_IMAGES_BASE_URL}/${filename}.png`,
    };
  }, []);

  const response = useStreamJSON(THEMES_CONTENT_URL, {
    initialData: [] as ExternalTheme[],
    transform: transformContentToTheme,
    filter: filterThemes,
  });

  return response;
};
