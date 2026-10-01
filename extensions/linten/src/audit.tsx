import { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Clipboard,
  Icon,
  Color,
  open,
  useNavigation,
} from "@raycast/api";
import {
  auditRemoteUrl,
  auditRawContent,
  probeLinks,
  synthesizeCompanion,
  getBadgeMarkdown,
  formatToSpecV2,
  LINTEN_CLOUD_BASE,
  AuditReport,
  LinkProbeReport,
} from "./api";

export function AuditReportView({
  target,
  auditReport,
  linkReport,
}: {
  target: string;
  auditReport: AuditReport;
  linkReport: LinkProbeReport | null;
}) {
  const { pop } = useNavigation();

  async function handleCompileCompanion() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Compiling llms-full.txt...",
      message: "Extracting clean documentation from declared links",
    });

    try {
      const isUrl =
        /^https?:\/\//i.test(target.trim()) ||
        (target.trim().includes(".") && !target.includes("\n"));
      const res = await synthesizeCompanion(
        isUrl ? { url: target.trim() } : { content: target },
      );

      if (!res.ok || !res.fullContent) {
        throw new Error(res.error || "Failed to synthesize companion archive.");
      }

      await Clipboard.copy(res.fullContent);
      toast.style = Toast.Style.Success;
      toast.title = "Companion Archive Compiled";
      toast.message = `Copied llms-full.txt to clipboard (~${(res.metrics?.estimatedTokens || 0).toLocaleString()} tokens)`;
    } catch (err: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = "Compilation Failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  async function handleFormatMarkdown() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Formatting to Spec v2...",
      message: "Normalizing AST headings, bullets, and link lines",
    });

    try {
      let rawText = target;
      const isUrl =
        /^https?:\/\//i.test(target.trim()) ||
        (target.trim().includes(".") && !target.includes("\n"));
      if (isUrl) {
        let cleanUrl = target.trim();
        if (
          !cleanUrl.startsWith("http://") &&
          !cleanUrl.startsWith("https://")
        ) {
          cleanUrl = "https://" + cleanUrl;
        }
        if (!cleanUrl.endsWith("/llms.txt") && !cleanUrl.includes("llms.txt")) {
          cleanUrl = cleanUrl.replace(/\/$/, "") + "/llms.txt";
        }
        const resp = await fetch(cleanUrl, {
          headers: {
            "User-Agent": "Linten-Raycast/1.0 (+https://loopstates.com)",
          },
        });
        if (!resp.ok)
          throw new Error(`Could not fetch ${cleanUrl} (HTTP ${resp.status})`);
        rawText = await resp.text();
      }

      const formatted = formatToSpecV2(rawText);
      await Clipboard.copy(formatted);
      toast.style = Toast.Style.Success;
      toast.title = "Formatted to Spec v2";
      toast.message = "Canonical markdown copied to clipboard";
    } catch (err: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = "Formatting Failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  const overallScore = auditReport?.report?.scores?.overall ?? 0;
  const structureScore = auditReport?.report?.scores?.structure ?? 0;
  const linkScore = auditReport?.report?.scores?.links ?? 0;
  const bestPracticesScore = auditReport?.report?.scores?.bestPractices ?? 0;
  const findings = auditReport?.report?.findings || [];
  const tokens = auditReport?.specialistMetrics?.tokens;
  const scoreColor =
    overallScore >= 80
      ? Color.Green
      : overallScore >= 50
        ? Color.Orange
        : Color.Red;
  const scoreIcon =
    overallScore >= 80
      ? Icon.CheckCircle
      : overallScore >= 50
        ? Icon.ExclamationMark
        : Icon.XMarkCircle;

  const reportActions = (
    <ActionPanel>
      <Action
        title="Compile llms-full.txt to Clipboard"
        icon={Icon.Document}
        shortcut={{ modifiers: ["cmd"], key: "return" }}
        onAction={handleCompileCompanion}
      />
      <Action
        title="Format Markdown to Spec v2"
        icon={Icon.WrenchScrewdriver}
        shortcut={{ modifiers: ["cmd"], key: "f" }}
        onAction={handleFormatMarkdown}
      />
      <Action.CopyToClipboard
        title="Copy Spec v2 Badge Code"
        icon={Icon.Tag}
        shortcut={{ modifiers: ["cmd"], key: "b" }}
        content={getBadgeMarkdown(target)}
      />
      <Action
        title="Open in Linten Web Inspector"
        icon={Icon.Globe}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
        onAction={() =>
          open(`${LINTEN_CLOUD_BASE}/?url=${encodeURIComponent(target)}`)
        }
      />
      <Action
        title="Audit Another Target"
        icon={Icon.ArrowLeft}
        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
        onAction={pop}
      />
    </ActionPanel>
  );

  return (
    <List
      isShowingDetail={true}
      searchBarPlaceholder="Filter audit results..."
      actions={reportActions}
    >
      <List.Section title="Audit Overview">
        <List.Item
          id="overview-score"
          icon={{ source: scoreIcon, tintColor: scoreColor }}
          title="Spec v2 Quality Score"
          accessories={[
            { tag: { value: `${overallScore} / 100`, color: scoreColor } },
          ]}
          actions={reportActions}
          detail={
            <List.Item.Detail
              markdown={`# Linten Spec v2 Audit Report\n\n**Target**: \`${target}\`\n\n### Overall Quality: **${overallScore}/100**\n\n| Section | Score |\n|:---|:---:|\n| Structure | **${structureScore}%** |\n| Link Health | **${linkScore}%** |\n| Best Practices | **${bestPracticesScore}%** |\n\nUse \`⌘↵\` to compile \`llms-full.txt\`, or \`⌘F\` to normalize this document to canonical Spec v2.`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.TagList title="Overall Quality">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={`${overallScore} / 100`}
                      color={scoreColor}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Structure"
                    text={`${structureScore}%`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Link Health"
                    text={`${linkScore}%`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Best Practices"
                    text={`${bestPracticesScore}%`}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Gemini 2.0 (1M)"
                    text={`~${(tokens?.gemini || 0).toLocaleString()} tokens`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Claude 3.5 (200k)"
                    text={`~${(tokens?.claude || 0).toLocaleString()} tokens`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="GPT-4o (128k)"
                    text={`~${(tokens?.gpt4o || 0).toLocaleString()} tokens`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="DeepSeek-V3 (64k)"
                    text={`~${(tokens?.deepseek || 0).toLocaleString()} tokens`}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Link
                    title="Powered by"
                    target="https://loopstates.com"
                    text="Loopstates"
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      </List.Section>

      <List.Section title={`Diagnostics & Findings (${findings.length})`}>
        {findings.length === 0 ? (
          <List.Item
            id="finding-none"
            icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            title="Flawless Compliance"
            subtitle="All Spec v2 requirements satisfied"
            actions={reportActions}
            detail={
              <List.Item.Detail
                markdown={`# Perfect Compliance\n\nNo errors or warnings were detected. This manifest meets all LLMs.txt Spec v2 standards.`}
              />
            }
          />
        ) : (
          findings.map((f, idx) => {
            const isErr = f.severity === "error";
            const isWarn = f.severity === "warning";
            const tint = isErr ? Color.Red : isWarn ? Color.Orange : Color.Blue;
            const icon = isErr
              ? Icon.XMarkCircle
              : isWarn
                ? Icon.ExclamationMark
                : Icon.Info;
            return (
              <List.Item
                key={`finding-${idx}`}
                id={`finding-${idx}`}
                icon={{ source: icon, tintColor: tint }}
                title={f.title}
                accessories={[
                  { tag: { value: f.severity.toUpperCase(), color: tint } },
                ]}
                actions={reportActions}
                detail={
                  <List.Item.Detail
                    markdown={`# [${f.severity.toUpperCase()}] ${f.title}\n\n${f.detail ? `### Detail\n${f.detail}\n\n` : ""}${f.recommendation ? `### Recommendation\n${f.recommendation}\n` : ""}`}
                  />
                }
              />
            );
          })
        )}
      </List.Section>

      {linkReport && linkReport.results && linkReport.results.length > 0 && (
        <List.Section
          title={`Probed Links (${linkReport.auditedCount} Audited)`}
        >
          {linkReport.results.map((r, idx) => {
            const statusTag = r.ok
              ? "200 OK"
              : r.status === 301 || r.status === 302
                ? `${r.status} Redirect`
                : `${r.status} Broken`;
            const tint = r.ok
              ? Color.Green
              : r.status === 301 || r.status === 302
                ? Color.Orange
                : Color.Red;
            const icon = r.ok
              ? Icon.CheckCircle
              : r.status === 301 || r.status === 302
                ? Icon.ArrowRightCircle
                : Icon.XMarkCircle;
            return (
              <List.Item
                key={`link-${idx}`}
                id={`link-${idx}`}
                icon={{ source: icon, tintColor: tint }}
                title={r.title}
                subtitle={r.url}
                accessories={[
                  { text: `${r.latencyMs}ms` },
                  { tag: { value: statusTag, color: tint } },
                ]}
                actions={reportActions}
                detail={
                  <List.Item.Detail
                    markdown={`# ${r.title}\n\n* **URL**: [${r.url}](${r.url})\n* **HTTP Status**: \`${statusTag}\`\n* **Latency**: ${r.latencyMs}ms\n\n${r.redirectUrl ? `* **Redirected To**: [${r.redirectUrl}](${r.redirectUrl})\n` : ""}`}
                  />
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

export default function AuditCommand() {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState<string>("");
  const [clipboardContent, setClipboardContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    async function checkClipboard() {
      try {
        const clip = await Clipboard.readText();
        if (clip && clip.trim().length > 0) {
          setClipboardContent(clip.trim());
        }
      } catch {
        // Clipboard access failure is non-fatal
      }
    }
    checkClipboard();
  }, []);

  async function runAudit(input: string) {
    const trimmed = input.trim();
    if (!trimmed) {
      showToast({
        style: Toast.Style.Failure,
        title: "Input Required",
        message: "Enter a valid URL or paste markdown.",
      });
      return;
    }

    setLoading(true);

    const isUrl =
      /^https?:\/\//i.test(trimmed) ||
      (trimmed.includes(".") && !trimmed.includes("\n"));

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Auditing llms.txt...",
      message: isUrl ? trimmed : "Scanning markdown structure",
    });

    try {
      let auditRes: AuditReport;
      let linkRes: LinkProbeReport;

      let cleanUrl = trimmed;
      if (isUrl) {
        if (
          !cleanUrl.startsWith("http://") &&
          !cleanUrl.startsWith("https://")
        ) {
          cleanUrl = "https://" + cleanUrl;
        }
        if (!cleanUrl.endsWith("/llms.txt") && !cleanUrl.includes("llms.txt")) {
          cleanUrl = cleanUrl.replace(/\/$/, "") + "/llms.txt";
        }

        [auditRes, linkRes] = await Promise.all([
          auditRemoteUrl(cleanUrl),
          probeLinks({ baseUrl: cleanUrl, urls: [cleanUrl] }).catch(() => ({
            ok: false,
            total: 0,
            auditedCount: 0,
            summary: { ok: 0, redirect: 0, broken: 0, timeout: 0, score: 0 },
            results: [],
          })),
        ]);
      } else {
        [auditRes, linkRes] = await Promise.all([
          auditRawContent(trimmed),
          probeLinks({ content: trimmed }).catch(() => ({
            ok: false,
            total: 0,
            auditedCount: 0,
            summary: { ok: 0, redirect: 0, broken: 0, timeout: 0, score: 0 },
            results: [],
          })),
        ]);
      }

      toast.style = Toast.Style.Success;
      toast.title = "Audit Complete";
      const score = auditRes.report?.scores?.overall ?? 0;
      toast.message = `Quality Score: ${score}/100`;

      // Push AuditReportView onto Raycast navigation stack so the window stays firmly open
      push(
        <AuditReportView
          target={cleanUrl}
          auditReport={auditRes}
          linkReport={linkRes}
        />,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.style = Toast.Style.Failure;
      toast.title = "Audit Failed";
      toast.message = msg;
    } finally {
      setLoading(false);
    }
  }

  const initialActions = (
    <ActionPanel>
      <Action
        title="Audit Target"
        icon={Icon.MagnifyingGlass}
        onAction={() => {
          if (!searchText.trim()) {
            showToast({
              style: Toast.Style.Failure,
              title: "Input Required",
              message:
                "Enter a valid URL (e.g. acme.com/llms.txt) or paste markdown in search bar.",
            });
            return;
          }
          runAudit(searchText.trim());
        }}
      />
      {clipboardContent && (
        <Action
          title="Audit from Clipboard"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => runAudit(clipboardContent)}
        />
      )}
    </ActionPanel>
  );

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Enter URL (e.g. acme.com/llms.txt) or paste markdown..."
      onSearchTextChange={setSearchText}
      actions={initialActions}
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="Enter an llms.txt URL or paste markdown"
        description="Type in the search bar above to audit Spec v2 syntax, link health, and token budgets."
      />
      {searchText.trim().length > 0 && (
        <List.Section title="Ready to Audit">
          <List.Item
            id="search-input"
            icon={Icon.MagnifyingGlass}
            title={`Audit "${searchText.trim()}"`}
            subtitle="Press Enter to validate"
            actions={
              <ActionPanel>
                <Action
                  title="Audit Entered Target"
                  icon={Icon.Check}
                  onAction={() => runAudit(searchText.trim())}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {clipboardContent ? (
        <List.Section title="Clipboard">
          <List.Item
            id="clip-target"
            icon={Icon.Clipboard}
            title="Audit from Clipboard"
            subtitle={
              clipboardContent.length > 60
                ? clipboardContent.slice(0, 60) + "..."
                : clipboardContent
            }
            accessories={[{ tag: { value: "Clipboard", color: Color.Blue } }]}
            actions={
              <ActionPanel>
                <Action
                  title="Audit Clipboard Target"
                  icon={Icon.Check}
                  onAction={() => runAudit(clipboardContent)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
    </List>
  );
}
