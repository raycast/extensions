import { getPreferenceValues, List, ActionPanel, Action } from "@raycast/api";
import { codeGenerateApi } from "./api";
import { useSearch, onCopy } from "./hooks";

const languageCommentMap = {
  "C++": "//",
  C: "//",
  "C#": "//",
  Java: "//",
  Python: "#",
  HTML: ["<!--", "-->"],
  PHP: "//",
  Javascript: "//",
  TypeScript: "//",
  Go: "//",
  Rust: "//",
  SQL: "--",
  Kotlin: "//",
  Fortran: "!",
  R: "#",
};
type PerType = keyof typeof languageCommentMap;
function generatePrompt(e: string) {
  const { language } = getPreferenceValues<{ language: PerType }>();
  const prefix = languageCommentMap[language];
  if (typeof prefix === "string") {
    return `${prefix}${e}\n`;
  } else {
    return `${prefix[0]}${e}${prefix[1]}\n`;
  }
}

export default function Command() {
  const { rawCode, onSearchTextChange, code } = useSearch({
    api: codeGenerateApi,
    generatePrompt,
  });
  const copy = () => onCopy({ rawCode });
  return (
    <List
      throttle
      isShowingDetail
      onSearchTextChange={onSearchTextChange}
      searchBarPlaceholder="Enter your description of the code"
    >
      {code && (
        <List.Item
          title="First Result"
          detail={<List.Item.Detail markdown={code} />}
          actions={
            <ActionPanel>
              <Action title="Copy" onAction={copy} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
