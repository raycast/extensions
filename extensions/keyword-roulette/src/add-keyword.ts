import { LaunchProps, showHUD } from "@raycast/api";
import { writeKeywords, readKeywords, KEYWORDS_FILE_PATH } from "./lib/keywords-manager";

// Type for command arguments
type AddKeywordArguments = {
  keyword: string;
};

export default async function Command(props: LaunchProps<{ arguments: AddKeywordArguments }>) {
  try {
    const { keyword } = props.arguments;

    const keywords = await readKeywords(KEYWORDS_FILE_PATH);

    // Check if keyword already exists
    if (keywords.includes(keyword.trim())) {
      await showHUD(`❎ Keyword '${keyword}' already exists`);
      return;
    }

    // Add keyword and write to file
    keywords.push(keyword.trim());
    await writeKeywords(keywords);
    await showHUD(`✅ Added keyword: '${keyword}'`, { clearRootSearch: true });
  } catch (error) {
    console.error("Error in add-keyword:", error);
    await showHUD("❌ Add keyword failed");
  }
}
