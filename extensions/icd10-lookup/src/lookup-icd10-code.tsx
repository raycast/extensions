import { useState } from "react";
import { ActionPanel, List, Action, showToast, ToastStyle } from "@raycast/api";
import axios from "axios";

interface ICD10Response {
  [index: number]: [string, string][];
  3: [string, string][];
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<{ code: string; desc: string }[]>([]);

  const handleSearch = async (query: string) => {
    if (query.length < 3) {
      setResults([]);
      return;
    }

    try {
      const response = await axios.get<ICD10Response>(
        `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${query}&maxList=1000`,
      );
      const data = response.data[3];
      const codes = data.map((item) => ({
        code: item[0],
        desc: item[1],
      }));
      setResults(codes);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        showToast(ToastStyle.Failure, "Failed to fetch data", error.message);
      } else {
        showToast(ToastStyle.Failure, "Failed to fetch data", "An unknown error occurred.");
      }
    }
  };

  return (
    <List
      searchBarPlaceholder="Type to search for ICD-10 codes..."
      onSearchTextChange={(query) => {
        setSearchText(query);
        handleSearch(query);
      }}
      isLoading={searchText.length >= 3 && results.length === 0}
    >
      {results.map((result) => (
        <List.Item
          key={result.code}
          title={result.code}
          subtitle={result.desc}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={result.code} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
