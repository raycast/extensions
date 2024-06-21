import { rule, indexCollection } from "../utils/types";
import { List } from "@raycast/api";
import { getDnd } from "../utils/dndData";

type mechanicType = {
  isLoading: boolean;
  data: indexCollection & {
    desc: string | string[];
  };
};

export default function MechanicDetail(rule: rule) {
  const url = rule.url;

  if (!url) {
    return <List.Item.Detail markdown={`No URL provided for ${rule.index}`} />;
  }

  const mechanicDetails = getDnd(url ?? "") as mechanicType;

  if (!mechanicDetails?.data && mechanicDetails.isLoading) {
    return <List.Item.Detail isLoading={true} markdown={`Loading ${rule.index}...`} />;
  }
  return (
    <List.Item.Detail
      isLoading={mechanicDetails.isLoading}
      markdown={
        Array.isArray(mechanicDetails.data?.desc) ? mechanicDetails.data?.desc.join("\n\n") : mechanicDetails.data?.desc
      }
    />
  );
}
