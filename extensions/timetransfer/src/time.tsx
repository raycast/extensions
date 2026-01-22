import { getSelectedText } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import FormatView from "./FormatView";
import { tryConvert } from "./utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  // 1. fetch selected text only once on mount
  const { isLoading: isLoadingSelection } = usePromise(getSelectedText, [], {
    onData: (data) => {
      if (data) {
        setSearchText(data);
      }
    },
    onError: () => {
      // ignore
    },
  });

  // 2. convert based on current searchText
  const { data: output, isLoading: isConverting } = usePromise(tryConvert, [searchText]);

  return (
    <FormatView
      output={output}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isLoading={isLoadingSelection || isConverting}
    />
  );
}
