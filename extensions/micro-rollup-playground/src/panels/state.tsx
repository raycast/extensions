import { Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { mdJson } from "../utils/helpers";

export const State = (props: { apiUrl: string }) => {
  const { data, isLoading } = useFetch(`${props.apiUrl}/state`);

  return <Detail isLoading={isLoading} markdown={`## State\n\n${mdJson(data)}`} />;
};
