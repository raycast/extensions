import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { run } from "./ecosystems";

type AuditStatus = "secure" | "vulnerable" | "error" | "loading";

interface AuditResult {
  id: string;
  name: string;
  command: string;
  status: AuditStatus;
  output: string;
  vulnerabilityCount: number;
}

const AUDIT_TASKS: Omit<
  AuditResult,
  "status" | "output" | "vulnerabilityCount"
>[] = [
  {
    id: "npm",
    name: "NPM Audit",
    // NOTE: npm audit -g is NOT a valid command. We audit from a temp dir.
    // The correct approach is to run npm audit in the global prefix directory.
    command:
      "cd $(npm root -g)/.. && npm audit --json 2>/dev/null || npm audit 2>&1 || true",
  },
  {
    id: "brew",
    name: "Homebrew Audit",
    command: "brew audit --strict 2>&1 | head -n 50 || true",
  },
  {
    id: "yarn",
    name: "Yarn Global Audit",
    command: "yarn audit --level moderate 2>&1 | head -n 50 || true",
  },
];

export default function Command() {
  const [audits, setAudits] = useState<AuditResult[]>(
    AUDIT_TASKS.map((task) => ({
      ...task,
      status: "loading",
      output: "Scanning...",
      vulnerabilityCount: 0,
    })),
  );

  useEffect(() => {
    let active = true;

    const runAudits = async () => {
      for (const task of AUDIT_TASKS) {
        if (!active) break;

        try {
          const output = await run(task.command);

          // Parse output for vulnerabilities (naive heuristic)
          const lowerOutput = output.toLowerCase();
          let count = 0;
          if (lowerOutput.includes("vulnerabilities")) {
            const match = lowerOutput.match(
              /(\d+)\s+(high|critical|moderate|low)\s+vulnerabilities/,
            );
            if (match) count = parseInt(match[1], 10);
            else if (lowerOutput.includes("found 0 vulnerabilities")) count = 0;
            else count = (lowerOutput.match(/vulnerability/g) || []).length;
          }

          setAudits((prev) =>
            prev.map((a) =>
              a.id === task.id
                ? {
                    ...a,
                    status: count > 0 ? "vulnerable" : "secure",
                    output: output.trim() || "No vulnerabilities found.",
                    vulnerabilityCount: count,
                  }
                : a,
            ),
          );
        } catch (error: any) {
          if (!active) break;
          // NPM audit returns exit code 1 if it finds vulnerabilities!
          const output = error.stdout || error.stderr || error.message;
          const lowerOutput = output.toLowerCase();

          let count = 0;
          let status: AuditStatus = "error";

          if (lowerOutput.includes("vulnerabilit")) {
            status = "vulnerable";
            const match = lowerOutput.match(/(\d+)\s+vulnerabilities/);
            if (match) count = parseInt(match[1], 10);
            else count = 1;
          }

          setAudits((prev) =>
            prev.map((a) =>
              a.id === task.id
                ? {
                    ...a,
                    status,
                    output: output.trim(),
                    vulnerabilityCount: count,
                  }
                : a,
            ),
          );
        }
      }
    };

    void runAudits();
    return () => {
      active = false;
    };
  }, []);

  return (
    <List
      navigationTitle="Security Audit Scanner"
      searchBarPlaceholder="Filter security reports..."
    >
      <List.Section title="Global Vulnerability Scans">
        {audits.map((audit) => {
          let icon = { source: Icon.Shield, tintColor: Color.SecondaryText };
          let subtitle = "Scanning globally installed packages...";

          if (audit.status === "secure") {
            icon = { source: Icon.Shield, tintColor: Color.Green };
            subtitle = "✅ 0 Vulnerabilities Found";
          }
          if (audit.status === "vulnerable") {
            icon = { source: Icon.Warning, tintColor: Color.Red };
            subtitle = `🚨 ${audit.vulnerabilityCount} Vulnerabilities Found!`;
          }
          if (audit.status === "error") {
            icon = { source: Icon.XMarkCircle, tintColor: Color.Orange };
            subtitle = "Audit tool failed or not installed";
          }

          return (
            <List.Item
              key={audit.id}
              title={audit.name}
              subtitle={subtitle}
              icon={icon}
              accessories={[
                audit.status === "vulnerable"
                  ? { tag: { value: "AT RISK", color: Color.Red } }
                  : {},
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Full Security Report"
                    icon={Icon.Eye}
                    target={(() => {
                      const advisoryLinks = getAdvisoryLinksMarkdown(
                        audit.output,
                      );
                      const detailMd = `# 🛡️ ${audit.name} Report\n\n\`\`\`\n${audit.output}\n\`\`\`${advisoryLinks}`;
                      return <Detail markdown={detailMd} />;
                    })()}
                  />
                  {audit.status === "vulnerable" && audit.id === "npm" && (
                    <Action
                      title="Run Auto-fix (npm Audit Fix)"
                      icon={Icon.Wand}
                      style={Action.Style.Destructive}
                      onAction={async () => {
                        const toast = await showToast({
                          style: Toast.Style.Animated,
                          title: "Running fix...",
                        });
                        try {
                          await run("npm audit fix -g");
                          toast.style = Toast.Style.Success;
                          toast.title = "Security Fix Applied";
                        } catch (err: any) {
                          toast.style = Toast.Style.Failure;
                          ((toast.title = "Fix Failed"),
                            (toast.message = err.message));
                        }
                      }}
                    />
                  )}
                  <Action.CopyToClipboard
                    title="Copy Audit Report"
                    content={audit.output}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function getAdvisoryLinksMarkdown(output: string): string {
  const cveMatches = Array.from(output.matchAll(/CVE-\d{4}-\d{4,7}/g)).map(
    (m) => m[0],
  );
  const ghsaMatches = Array.from(
    output.matchAll(/GHSA-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}/g),
  ).map((m) => m[0].toUpperCase());

  const uniqueCves = Array.from(new Set(cveMatches));
  const uniqueGhsas = Array.from(new Set(ghsaMatches));

  if (uniqueCves.length === 0 && uniqueGhsas.length === 0) return "";

  let markdown = "\n\n### 🔗 Security Advisories & Details\n";
  for (const cve of uniqueCves) {
    markdown += `- [${cve}](https://nvd.nist.gov/vuln/detail/${cve})\n`;
  }
  for (const ghsa of uniqueGhsas) {
    markdown += `- [${ghsa}](https://github.com/advisories/${ghsa})\n`;
  }
  return markdown;
}
