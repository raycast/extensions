import { List, Action, ActionPanel } from "@raycast/api";
import { useState, useMemo } from "react";
import statuses from "./statuses";

interface StatusCode {
  code: number;
  name: string;
  imagePath: string;
}

interface StatusFromFile {
  code: number;
  message: string;
}

const BASE_URL = "https://http.cat";

const STATUS_CODES: StatusCode[] = Object.values(statuses as Record<string, StatusFromFile>).map((status) => ({
  code: status.code,
  name: status.message,
  imagePath: `${status.code}.jpg`,
}));

export default function Command() {
  const [searchText, setSearchText] = useState("");

  // Filter and sort status codes by substring matching on code or name
  const filteredStatusCodes = useMemo(() => {
    return STATUS_CODES.filter((status) => {
      if (!searchText) return true;
      const searchLower = searchText.toLowerCase();
      const codeMatch = status.code.toString().includes(searchText);
      const nameMatch = status.name.toLowerCase().includes(searchLower);
      return codeMatch || nameMatch;
    }).sort((a, b) => a.code - b.code);
  }, [searchText]);

  return (
    <List searchBarPlaceholder="Search HTTP status codes..." onSearchTextChange={setSearchText} isShowingDetail>
      {filteredStatusCodes.map((status) => (
        <List.Item
          key={status.code}
          icon={status.imagePath}
          title={`${status.code}`}
          subtitle={status.name}
          detail={<List.Item.Detail markdown={`![HTTP Cat ${status.code}](${BASE_URL}/${status.code})`} />}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`${BASE_URL}/${status.code}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
