import { Detail, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { getAccessories } from "./utils";
import { MedalResult } from "./types";

export default function Command() {
  const url = "https://api.olympics.kevle.xyz/medals";

  const { data, isLoading, error } = useFetch<{ results: MedalResult[] }>(url, {
    parseResponse: (response: Response) => response.json(),
  });

  if (isLoading) return <Detail markdown="# Loading" />;
  if (error) return <Detail markdown={`# Error: ${error.message}`} />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search country">
      {data?.results?.map((item, index) => <MedalItem key={item.country.code} item={item} index={index} />)}
    </List>
  );
}

function MedalItem(props: { item: MedalResult; index: number }) {
  return (
    <List.Item
      icon={{ source: `flags/${props.item.country.code}.png` }}
      keywords={[props.item.country.code, props.item.country.name, props.item.country.iso_alpha_2]}
      title={props.item.country.code}
      subtitle={props.item.country.name}
      accessories={getAccessories(props)}
    />
  );
}
