import { Detail } from "@raycast/api";
import { useTranslate } from "./hooks.js";
import { ellipsis } from "./utils.js";

export default function Tag({ text }: { text: string }) {
  const { data } = useTranslate(text);
  return <Detail.Metadata.TagList.Item text={ellipsis(data || text)} color={"#eed535"} />;
}
