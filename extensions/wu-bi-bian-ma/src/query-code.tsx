import { List, LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

interface Item {
  id: number;
  code: string;
  word: string;
  version: string;
}

interface ResponseData {
  char: string;
  wubi86: string;
  wubi98: string;
  wubiXSJ: string;
  error: string;
}

function transformResponse(response: ResponseData): { data: Item[] } {
  console.info("response:", response);
  if (!response || response.error) {
    return { data: [] };
  }
  return {
    data: [
      { code: response.wubi86, word: response.char, version: "86 Version", id: 1 },
      { code: response.wubi98, word: response.char, version: "98 Version", id: 2 },
      { code: response.wubiXSJ, word: response.char, version: "New-century Version", id: 3 },
    ],
  };
}

export default function Command(props: LaunchProps<{ arguments: Arguments.QueryCode }>) {
  const { word } = props.arguments;
  const [searchText, setSearchText] = useState(word?.charAt(0) || "");

  const handleSearchChange = (text: string) => {
    if (text.length > 0) {
      setSearchText(text.charAt(0)); // Only keep the first character
    } else {
      setSearchText("");
    }
  };
  const { isLoading, data } = useFetch(`https://wubi.superyi.top/api/wubi?char=${searchText}`, {
    mapResult: transformResponse,
    parseResponse: async (response: Response) => {
      if (response.status != 200) {
        return { error: "not found" };
      }
      return response.json();
    },
  });

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={handleSearchChange}
      searchBarPlaceholder="Enter a single Chinese character to query its code"
      throttle
    >
      {data?.length === 0 ? (
        <List.EmptyView title="No results found" description="Try searching for a different character" />
      ) : (
        (data || []).map((item) => <List.Item key={item.id} title={item.code} subtitle={item.version} />)
      )}
    </List>
  );
}
