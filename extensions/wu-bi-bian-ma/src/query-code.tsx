import { List, LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

interface Item {
  id: number;
  code: string;
  word: string;
  version: string;
}

interface Response {
  char: string;
  wubi86: string;
  wubi98: string;
  wubiXSJ: string;
}

function transformResponse(response: Response): { data: Item[] } {
  return {
    data: [
      { code: response.wubi86, word: response.char, version: "86版", id: 1 },
      { code: response.wubi98, word: response.char, version: "98版", id: 2 },
      { code: response.wubiXSJ, word: response.char, version: "新世纪版", id: 3 },
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
  });

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={handleSearchChange}
      searchBarPlaceholder="输入单个汉字查询编码"
      throttle
    >
      {(data || []).map((item) => (
        <List.Item key={item.id} title={item.code} subtitle={item.version} />
      ))}
    </List>
  );
}
