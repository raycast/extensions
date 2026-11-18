import { Action, ActionPanel, List, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { useFetchNif } from "../hooks/useFetchNif";
import CompanyDetail from "../components/CompanyDetail";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data, error } = useFetchNif(searchText);
  const records = Array.isArray(data) ? data : data ? [data] : [];

  useEffect(() => {
    if (error) {
      showFailureToast(error, { title: "Failed to fetch NIF details" });
    }
  }, [error]);

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search by NIF..." throttle>
      {records.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={searchText.length < 9 ? "Search for a company" : "No results found"}
          description={searchText.length < 9 ? "Enter a NIF" : "Try a different NIF"}
        />
      ) : (
        records.map((record) => (
          <List.Item
            key={record.nif}
            title={record.name || ""}
            accessories={[{ text: `${record.nif}` }]}
            actions={
              <ActionPanel>
                <Action.Push title="Show Details" target={<CompanyDetail record={record} />} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
