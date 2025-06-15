import { rule, indexCollection } from "../utils/types";
import { Detail } from "@raycast/api";
import { getDnd } from "../utils/dndData";

type ruleType = {
  isLoading: boolean;
  data: indexCollection & {
    desc: string;
  };
};

export default function RuleDetail(rule: rule) {
  const ruleDetails = getDnd(`/api/rule-sections/${rule.index}`) as ruleType;
  return <Detail isLoading={ruleDetails.isLoading} markdown={ruleDetails.data?.desc} />;
}
