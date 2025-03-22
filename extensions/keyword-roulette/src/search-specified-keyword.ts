import { LaunchProps, showHUD, getPreferenceValues } from "@raycast/api";
import { searchOnPlatform, Platform, getRandomUnusedPlatform } from "./lib/platform-searcher";
import { isNotEmpty, readTextWithFallback } from "./lib/utils";

interface Preferences {
  defaultPlatform1: Platform;
  defaultPlatform2: Platform | "";
  randomPlatform: boolean;
}

// Type for command arguments
type SearchArguments = {
  keyword?: string;
};

export default async function Command(props: LaunchProps<{ arguments: SearchArguments }>) {
  try {
    // Get search keyword
    const searchText = await readTextWithFallback(props.arguments.keyword);

    if (isNotEmpty(searchText)) {
      const preferences = getPreferenceValues<Preferences>();

      // Calculate date: two months ago
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      const dateString = twoMonthsAgo.toISOString().split("T")[0];

      // Get platforms to search
      const selectedPlatforms = [preferences.defaultPlatform1];
      if (preferences.defaultPlatform2) {
        selectedPlatforms.push(preferences.defaultPlatform2);
      }

      // Search on selected platforms
      for (const platform of selectedPlatforms) {
        await searchOnPlatform(platform, searchText, dateString);
      }

      // If random platform option is enabled, search on an additional random platform
      if (preferences.randomPlatform) {
        const randomPlatform = getRandomUnusedPlatform(selectedPlatforms);
        await searchOnPlatform(randomPlatform, searchText, dateString);
      }

      await showHUD(`✅ Search specified keyword: '${searchText}'`, { clearRootSearch: true });
    } else {
      await showHUD("❌ No search keyword provided");
    }
  } catch (error) {
    await showHUD("❌ Open specified search failed");
  }
}
