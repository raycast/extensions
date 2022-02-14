import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { ErrorHandler } from "../utils/error";
import { GetRules } from "./client/http";
import { RuleT } from "./types";

// TODO: ruleProviders /providers/rules
export default function Rules(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState([] as Array<RuleT>);

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
    <List isLoading={loading}>
      {rules.map((rule, index) => (
        <List.Item key={index} title={rule.payload} subtitle={rule.type} accessoryTitle={rule.proxy} />
      ))}
    </List>
  );
}
