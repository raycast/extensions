import { Action, ActionPanel, List, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { useFetchNif } from "../hooks/useFetchNif";
import CompanyDetail from "../components/CompanyDetail";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data, error } = useFetchNif(searchText);
  const records = Array.isArray(data) ? data : data ? [data] : [];

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch NIF details",
        message: error.message,
      });
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
            key={record.taxId}
            title={record.companyName || ""}
            accessories={[{ text: `${record.taxId}` }]}
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
