import { getPreferenceValues, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Star } from "./response.model";
import { PackageListItem } from "./PackagListItem";

export default function PackageList() {
  const { githubUsername, resultsCount } = getPreferenceValues();

  const { data, isLoading } = useFetch<Star[], Star[]>(
    `https://api.github.com/users/${githubUsername}/starred?per_page=${resultsCount}`,
    {
      execute: !!githubUsername,
      initialData: [],
      failureToastOptions: {
        title: "Could not fetch stars",
        message: githubUsername ? undefined : "Please add your GitHub username to this extension's preferences",
      },
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter…">
      {data.map((item) => (
        <PackageListItem key={item.id} result={item} />
      ))}
    </List>
  );
}
