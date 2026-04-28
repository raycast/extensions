import { Action, ActionPanel, Clipboard, Detail, Icon, LocalStorage, open, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { execFile as execFileCb } from "child_process";
import { promisify } from "util";
import { buildHorizonLink } from "../../utils/horizonUrl";

const execFile = promisify(execFileCb);

interface SecurityGroupDetailViewProps {
  securityGroupId: string;
  securityGroupName: string;
  horizonUrl?: string;
  binaryPath: string;
  configName: string;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value || "—";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    if (value.every((v) => typeof v === "string")) return value.join(", ");
    return JSON.stringify(value, null, 2);
  }
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function formatKey(key: string): string {
  return key
    .replace(/^os-ext-[a-z]+:/i, "")
    .replace(/^os-[a-z]+-[a-z]+:/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface RuleRecord {
  [key: string]: unknown;
}

function buildRulesTable(rules: RuleRecord[]): string {
  if (rules.length === 0) return "No rules defined.";

  return (
    `| Direction | Protocol | Port Range | Ethertype | Remote |\n|-----------|----------|------------|-----------|--------|\n` +
    rules
      .map((rule) => {
        const direction = String(rule["Direction"] ?? rule["direction"] ?? "—");
        const protocol = String(rule["IP Protocol"] ?? rule["protocol"] ?? rule["ip_protocol"] ?? "Any");
        const portMin = rule["Port Range Min"] ?? rule["port_range_min"];
        const portMax = rule["Port Range Max"] ?? rule["port_range_max"];
        let portRange = "All";
        if (portMin != null && portMax != null) {
          portRange = portMin === portMax ? String(portMin) : `${portMin}-${portMax}`;
        }
        const ethertype = String(rule["Ether Type"] ?? rule["ethertype"] ?? "—");
        const remote = String(
          rule["IP Range"] ??
            rule["remote_ip_prefix"] ??
            rule["Remote Security Group"] ??
            rule["remote_group_id"] ??
            "Any",
        );
        return `| ${direction} | ${protocol} | ${portRange} | ${ethertype} | ${remote} |`;
      })
      .join("\n")
  );
}

export default function SecurityGroupDetailView({
  securityGroupId,
  securityGroupName,
  horizonUrl,
  binaryPath,
  configName,
}: SecurityGroupDetailViewProps) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [rules, setRules] = useState<RuleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const cacheKey = `detail:security-group-detail:${securityGroupId}`;
  const rulesCacheKey = `detail:security-group-rules:${securityGroupId}`;

  const fetchData = useCallback(async () => {
    try {
      const [groupResult, rulesResult] = await Promise.all([
        execFile(binaryPath, ["--os-cloud", configName, "security", "group", "show", securityGroupId, "-f", "json"], {
          timeout: 30000,
          maxBuffer: 10 * 1024 * 1024,
        }),
        execFile(
          binaryPath,
          ["--os-cloud", configName, "security", "group", "rule", "list", securityGroupId, "-f", "json"],
          { timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
        ),
      ]);

      const parsedGroup = JSON.parse(groupResult.stdout) as Record<string, unknown>;
      const parsedRules = JSON.parse(rulesResult.stdout) as RuleRecord[];

      setData(parsedGroup);
      setRules(parsedRules);
      await LocalStorage.setItem(cacheKey, JSON.stringify(parsedGroup));
      await LocalStorage.setItem(rulesCacheKey, JSON.stringify(parsedRules));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await showToast({ style: Toast.Style.Failure, title: "Failed to load security group", message });
    } finally {
      setIsLoading(false);
    }
  }, [binaryPath, configName, securityGroupId, cacheKey, rulesCacheKey]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Load cached data immediately
      try {
        const cachedGroup = await LocalStorage.getItem<string>(cacheKey);
        const cachedRules = await LocalStorage.getItem<string>(rulesCacheKey);
        if (cachedGroup && !cancelled) {
          setData(JSON.parse(cachedGroup) as Record<string, unknown>);
        }
        if (cachedRules && !cancelled) {
          setRules(JSON.parse(cachedRules) as RuleRecord[]);
        }
      } catch {
        // Ignore cache read errors
      }

      // Fetch fresh data
      if (!cancelled) {
        await fetchData();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, rulesCacheKey, fetchData]);

  const horizonLink = buildHorizonLink(horizonUrl, "security_groups", securityGroupId);

  if (!data) {
    const markdown = isLoading
      ? `# ${securityGroupName}\n\nLoading security group details...`
      : `# ${securityGroupName}\n\nFailed to load security group details.`;
    return (
      <Detail isLoading={isLoading} navigationTitle={`Security Group: ${securityGroupName}`} markdown={markdown} />
    );
  }

  const name = (data["name"] as string) ?? (data["Name"] as string) ?? securityGroupName;
  const description = (data["description"] as string) ?? (data["Description"] as string) ?? "";

  const rulesTable = buildRulesTable(rules);
  const markdown = `# ${name}\n\n${description ? `> ${description}\n\n` : ""}## Rules\n\n${rulesTable}`;

  const entries = Object.entries(data);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Security Group: ${name}`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {entries.map(([key, value]) => (
            <Detail.Metadata.Label key={key} title={formatKey(key)} text={formatValue(value)} />
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Copy Id"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={() => {
              Clipboard.copy(securityGroupId);
              showToast({ style: Toast.Style.Success, title: "Copied ID", message: securityGroupId });
            }}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={async () => {
              setIsLoading(true);
              await fetchData();
            }}
          />
          {horizonLink && (
            <Action
              title="Open in Browser"
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={() => open(horizonLink)}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
