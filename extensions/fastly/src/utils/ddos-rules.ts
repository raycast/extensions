import { Color, Icon, List } from "@raycast/api";
import { DdosProtectionRule } from "../types";

export const DDOS_RULE_ACTIONS: Array<{ value: string; title: string; icon: Icon }> = [
  { value: "default", title: "Default (Follow Service Mode)", icon: Icon.Circle },
  { value: "block", title: "Block", icon: Icon.Shield },
  { value: "log", title: "Log", icon: Icon.Document },
  { value: "off", title: "Off", icon: Icon.XMarkCircle },
];

export function ddosRuleActionTag(action?: string): List.Item.Accessory {
  switch (action) {
    case "block":
      return { tag: { value: "Block", color: Color.Green }, tooltip: "Matching traffic is blocked" };
    case "log":
      return { tag: { value: "Log", color: Color.Orange }, tooltip: "Matching traffic is logged, not blocked" };
    case "off":
      return { tag: { value: "Off", color: Color.Red }, tooltip: "This rule is disabled" };
    default:
      return {
        tag: { value: "Default", color: Color.SecondaryText },
        tooltip: "Follows the service's protection mode",
      };
  }
}

// Human-readable summary of the traffic attributes a rule matches on
export function ddosRuleAttributes(rule: DdosProtectionRule): string[] {
  const attributes: string[] = [];
  if (rule.source_ip) attributes.push(`IP: ${rule.source_ip}`);
  if (rule.source_ip_prefix) attributes.push(`Prefix: ${rule.source_ip_prefix}`);
  if (rule.country_code) attributes.push(`Country: ${rule.country_code}`);
  if (rule.asn) attributes.push(`ASN: ${rule.asn}`);
  if (rule.host) attributes.push(`Host: ${rule.host}`);
  if (rule.additional_attributes?.length) attributes.push(...rule.additional_attributes);
  return attributes;
}
