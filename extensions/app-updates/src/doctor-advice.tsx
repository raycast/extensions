import { AI, Action, ActionPanel, Clipboard, Detail, Icon, showHUD } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import type { DoctorWarning } from "./utils/brew-maintenance";
import { getStoredDoctorWarnings } from "./utils/doctor-store";

const WARNING_PROMPT = `You are a Homebrew expert. Analyze this \`brew doctor\` warning and respond with EXACTLY this format (no extra text, no markdown headers):

SEVERITY: [one of: 🟢 Cosmetic | 🟡 Minor | 🔴 Important]
EXPLANATION: [1-2 sentences explaining what this means in plain language]
FIX: [the exact terminal command(s) to fix it, one per line]
RISK: [1 sentence about risks of running the fix, or "None" if safe]`;

type WarningAdvice = {
  severity: string;
  explanation: string;
  fix: string;
  risk: string;
};

function parseAdvice(raw: string): WarningAdvice {
  const severity = raw.match(/SEVERITY:\s*(.+)/)?.[1]?.trim() ?? "🟡 Minor";
  const explanation =
    raw.match(/EXPLANATION:\s*([\s\S]*?)(?=\nFIX:|$)/)?.[1]?.trim() ?? "Unable to analyze this warning.";
  const fix = raw.match(/FIX:\s*([\s\S]*?)(?=\nRISK:|$)/)?.[1]?.trim() ?? "No fix available.";
  const risk = raw.match(/RISK:\s*([\s\S]*?)$/)?.[1]?.trim() ?? "Unknown";
  return { severity, explanation, fix, risk };
}

function buildMarkdown(warnings: DoctorWarning[], advices: (WarningAdvice | null)[], progress: number): string {
  let md = `#### Brew Doctor Advice\n\n`;

  if (progress < warnings.length) {
    md += `*Analyzing warning ${progress + 1} of ${warnings.length}...*\n\n---\n\n`;
  }

  for (let i = 0; i < warnings.length; i++) {
    const w = warnings[i];
    const a = advices[i];

    md += `##### ${i + 1}. ${w.title}\n\n`;

    if (!a) {
      if (i === progress) {
        md += `*Analyzing...*\n\n`;
      }
      continue;
    }

    md += `${a.severity} — ${a.explanation}\n\n`;

    if (w.details) {
      md += `\`\`\`\n${w.details}\n\`\`\`\n\n`;
    }

    // Format fix commands as a code block
    const fixLines = a.fix
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (fixLines.length > 0 && fixLines[0] !== "No fix available.") {
      md += `\`\`\`bash\n${fixLines.join("\n")}\n\`\`\`\n\n`;
    }

    if (a.risk && a.risk !== "None") {
      md += `> ${a.risk}\n\n`;
    }

    md += `---\n\n`;
  }

  // Summary (only when all warnings have been analyzed)
  const completed = advices.filter((a): a is WarningAdvice => a !== null);
  if (completed.length === warnings.length && warnings.length > 0) {
    const counts = { important: 0, minor: 0, cosmetic: 0 };
    for (const a of completed) {
      if (a.severity.includes("🔴")) counts.important++;
      else if (a.severity.includes("🟡")) counts.minor++;
      else counts.cosmetic++;
    }

    const parts = [];
    if (counts.important > 0) parts.push(`${counts.important} 🔴 Important`);
    if (counts.minor > 0) parts.push(`${counts.minor} 🟡 Minor`);
    if (counts.cosmetic > 0) parts.push(`${counts.cosmetic} 🟢 Cosmetic`);

    md += `#### Summary\n\n`;
    md += `**${warnings.length} warnings:** ${parts.join(", ")}\n\n`;

    const allFixLines = completed
      .flatMap((a) =>
        a.fix
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
      )
      .filter((l) => l !== "No fix available.");

    if (allFixLines.length > 0) {
      md += `All fix commands:\n\n\`\`\`bash\n${allFixLines.join("\n")}\n\`\`\`\n`;
    }
  }

  return md;
}

export default function Command() {
  const [warnings, setWarnings] = useState<DoctorWarning[]>([]);
  const [advices, setAdvices] = useState<(WarningAdvice | null)[]>([]);
  const [progress, setProgress] = useState(0);

  const { isLoading } = usePromise(async () => {
    const loaded = await getStoredDoctorWarnings();
    setWarnings(loaded);

    if (loaded.length === 0) return;

    const results: (WarningAdvice | null)[] = new Array(loaded.length).fill(null);
    setAdvices([...results]);

    for (let i = 0; i < loaded.length; i++) {
      setProgress(i);
      const w = loaded[i];
      const details = w.details ? `\nDetails: ${w.details}` : "";
      const prompt = `${WARNING_PROMPT}\n\nWarning: ${w.title}${details}`;

      try {
        const response = await AI.ask(prompt, {
          creativity: "low",
          model: AI.Model["Anthropic_Claude_4.6_Sonnet"],
        });
        results[i] = parseAdvice(response);
      } catch {
        results[i] = {
          severity: "🟡 Minor",
          explanation: "Unable to analyze this warning (AI request failed).",
          fix: "No fix available.",
          risk: "Unknown",
        };
      }
      setAdvices([...results]);
    }
    setProgress(loaded.length);
  });

  const markdown =
    warnings.length === 0 && !isLoading
      ? "#### All Clear! ✅\n\nNo `brew doctor` warnings found. Run **Brew Maintenance** first to scan for issues."
      : buildMarkdown(warnings, advices, progress);

  // Collect all fix commands for the copy action
  const allFixes = advices
    .filter((a): a is WarningAdvice => a !== null && a.fix !== "No fix available.")
    .flatMap((a) =>
      a.fix
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    )
    .join("\n");

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Advice" content={markdown} />
          {allFixes && (
            <Action
              title="Copy All Fix Commands"
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(allFixes);
                await showHUD("Fix commands copied!");
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
