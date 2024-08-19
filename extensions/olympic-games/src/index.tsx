import { Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { getAccessories, getFlag } from "./utils";
import { MedalResult } from "./types";

export default function Command() {
  const url = "https://paris-2024-gamma.vercel.app/medals";

  const { data, isLoading } = useFetch<{ results: MedalResult[] }>(url, {
    parseResponse: (response: Response) => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return response.json();
    },
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Country">
      {data?.results?.map((item, index) => <MedalItem key={item.country.code} item={item} index={index} />)}
    </List>
  );
}

function MedalItem(props: { item: MedalResult; index: number }) {
  return (
    <List.Item
      icon={{ source: getFlag(props.item.country.code), fallback: Icon.Flag }}
      keywords={[props.item.country.code, props.item.country.name]}
      title={props.item.country.code}
      subtitle={props.item.country.name}
      accessories={getAccessories(props)}
    />
  );
}
