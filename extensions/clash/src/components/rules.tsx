import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { ErrorHandler } from "../utils/error";
import { GetRules } from "./client/http";
import { RuleT } from "./types";

// ref: https://github.com/Dreamacro/clash/blob/02333a859a57ddb528eb469f734ebc2669911ee9/constant/rule.go#L20
const ruleTypes = [
  "Domain",
  "DomainSuffix",
  "DomainKeyword",
  "GeoIP",
  "IPCIDR",
  "SrcIPCIDR",
  "SrcPort",
  "DstPort",
  "Process",
  "ProcessPath",
  "Match",
];

// TODO: ruleProviders /providers/rules
export default function Rules(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState([] as Array<RuleT>);
  const [ruleType, setRuleType] = useState(ruleTypes[0]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await GetRules();
        setRules(data);
      } catch (e) {
        ErrorHandler(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <List
      isLoading={loading}
      searchBarAccessory={
        <List.Dropdown tooltip="Type" storeValue={false} onChange={(newValue) => setRuleType(newValue)}>
          {ruleTypes.map((type, index) => (
            <List.Dropdown.Item key={index} title={type} value={type} />
          ))}
        </List.Dropdown>
      }
    >
      {rules
        .filter((rule) => rule.type === ruleType)
        .map((rule, index) => (
          <List.Item key={index} title={rule.payload} subtitle={rule.type} accessoryTitle={rule.proxy} />
        ))}
    </List>
  );
}
