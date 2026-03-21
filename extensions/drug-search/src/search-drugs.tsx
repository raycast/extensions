import { useState } from "react";
import { List, ActionPanel, Action, Color, Icon } from "@raycast/api";
import { useDrugSearch } from "./useDrugSearch";
import { DrugDetail } from "./drug-detail";
import { Result } from "./interfaces";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  // Use the custom hook
  const { data, isLoading, pagination, error } = useDrugSearch(
    searchText,
    // Note: Sorting by brand_name is not supported (analyzed field)
    // Valid sort fields: sponsor_name, application_number
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      pagination={pagination}
      throttle
    >
      {error && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Search Error"
          description={error.message || "Failed to fetch drug data"}
        />
      )}
      {data && data.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Results"
          description="Try searching with a different term"
        />
      )}
      {data &&
        data.map((drug: Result) => {
          const brandName = drug.products[0]?.brand_name || "Unknown Brand";
          const genericName = drug.openfda?.generic_name?.[0];
          const dosageForm = drug.products[0]?.dosage_form;
          const route = drug.products[0]?.route;
          const sponsor = drug.sponsor_name;

          // Build accessories array, filtering out empty values
          const accessories = [];

          if (genericName) {
            accessories.push({
              text: genericName,
              icon: Icon.Pill,
            });
          }

          if (dosageForm) {
            accessories.push({
              tag: {
                value: dosageForm,
                color: Color.Blue,
              },
              tooltip: "Dosage Form",
            });
          }

          if (route) {
            accessories.push({
              text: {
                value: route,
                color: Color.Green,
              },
              tooltip: "Route of Administration",
            });
          }

          if (drug.application_number) {
            accessories.push({
              tag: drug.application_number,
              tooltip: "Application Number",
            });
          }

          return (
            <List.Item
              key={drug.application_number + (drug.products[0]?.product_number || "")}
              title={brandName}
              subtitle={sponsor}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action.Push title="View Details" target={<DrugDetail drug={drug} />} />
                  <Action.OpenInBrowser
                    title="View on FDA API"
                    url={`https://api.fda.gov/drug/drugsfda.json?search=application_number:"${drug.application_number}"`}
                  />
                  <Action.CopyToClipboard title="Copy Brand Name" content={brandName} />
                  {genericName && <Action.CopyToClipboard title="Copy Generic Name" content={genericName} />}
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
