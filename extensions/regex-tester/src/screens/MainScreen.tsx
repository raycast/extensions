import { List } from "@raycast/api";
import { FC, useCallback, useEffect, useState } from "react";
import CheatSheet from "../components/CheatSheet";
import RegexOptions, { Options } from "../components/RegexOptions";

interface Props {
  testString: string;
}

const MainScreen: FC<Props> = ({ testString }) => {
  const [query, setQuery] = useState("");
  const [highlightedText, setHighlightedText] = useState("");
  const [options, setOptions] = useState<Options>("gm");

  const handleOptionsChange = useCallback((options: Options) => {
    setOptions(options);
  }, []);

  useEffect(() => {
    if (query === "") {
      setHighlightedText(testString);
      return;
    }
    try {
      const nextHighlightedText = testString.replace(new RegExp(query, options), (match) => `|${match}|`);
      setHighlightedText(nextHighlightedText);
    } catch (error) {
      console.log("regex error", error);
    }
  }, [testString, query, options]);

  return (
    <List
      isShowingDetail
      enableFiltering={false}
      searchBarPlaceholder="([A-Z])\w+"
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarAccessory={<RegexOptions onOptionsChange={handleOptionsChange} />}
    >
      <List.Item title="Preview" subtitle="" detail={<List.Item.Detail markdown={highlightedText} />} />
      <List.Item title="Cheat Sheet" subtitle="" detail={<CheatSheet />} />
    </List>
  );
};

export default MainScreen;
