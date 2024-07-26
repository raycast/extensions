import { Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { mdJson } from "../utils/helpers";

export const Config = (props: { apiUrl: string }) => {
  const { data, isLoading } = useFetch(`${props.apiUrl}/config`);
  return <Detail isLoading={isLoading} markdown={`## Config\n\n${mdJson(data)}`} />;
};
