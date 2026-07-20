import { Action, ActionPanel, Color, Detail, Icon, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useMemo, useState } from "react";

const API_URL = "https://api.usebouncer.com/v1.1/email/verify";

type BouncerResponse = {
  status?: string;
  reason?: string;
  domain?: {
    name?: string;
    disposable?: boolean;
    free?: boolean;
    acceptAll?: boolean;
  };
  provider?: string;
  score?: number | string;
  message?: string;
  error?: string;
  msg?: string;
};

type VerificationResult = {
  email: string;
  status: string;
  reason: string;
  domain: string;
  provider: string;
  score: string;
  disposable: string;
  free: string;
  acceptAll: string;
  verdict: string;
  verdictColor: Color;
};

export default function VerifyEmailCommand() {
  const { apiKey } = getPreferenceValues<Preferences>();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const cleanEmail = useMemo(() => email.replace(/\s+/g, ""), [email]);
  const isValidEnough = cleanEmail.includes("@");

  async function verifyEmail() {
    if (!cleanEmail) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter email address",
      });
      return;
    }

    if (!isValidEnough) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid email format",
      });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Checking email...",
    });

    try {
      const nextResult = await fetchVerification(cleanEmail, apiKey);
      setResult(nextResult);
      toast.style = Toast.Style.Success;
      toast.title = nextResult.verdict;
      toast.message = cleanEmail;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Verification failed";
      toast.message = error instanceof Error ? error.message : "Request was rejected";
    } finally {
      setIsLoading(false);
    }
  }

  if (result) {
    return <ResultDetail result={result} onBack={() => setResult(null)} onVerifyAgain={verifyEmail} />;
  }

  return (
    <List
      isLoading={isLoading}
      searchText={email}
      onSearchTextChange={setEmail}
      searchBarPlaceholder="Email address"
      filtering={false}
    >
      <List.Section title="Bouncer Email Verification">
        <List.Item
          title={cleanEmail || "Enter email address"}
          subtitle={cleanEmail ? "Press Enter to verify" : "Type above"}
          icon={isValidEnough ? Icon.Envelope : Icon.AtSymbol}
          accessories={cleanEmail ? [{ text: isValidEnough ? "Ready" : "Invalid" }] : undefined}
          actions={
            <ActionPanel>
              <Action title="Verify Email" icon={Icon.CheckCircle} onAction={verifyEmail} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function ResultDetail(props: { result: VerificationResult; onBack: () => void; onVerifyAgain: () => void }) {
  const { result, onBack, onVerifyAgain } = props;
  const markdown = getResultMarkdown(result);

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Verdict"
            text={result.verdict}
            icon={{
              source: getVerdictIcon(result.verdict),
              tintColor: result.verdictColor,
            }}
          />
          <Detail.Metadata.Label title="Score" text={result.score} />
          <Detail.Metadata.Label title="Email" text={result.email} />
          <Detail.Metadata.Label title="Reason" text={result.reason} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Domain" text={result.domain} />
          <Detail.Metadata.Label title="Provider" text={result.provider} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Signals" text={getSignalSummary(result)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Check Another Email" icon={Icon.ArrowClockwise} onAction={onBack} />
          <Action title="Refresh Current Email" icon={Icon.CheckCircle} onAction={onVerifyAgain} />
          <Action.CopyToClipboard title="Copy Email" content={result.email} />
          <Action.CopyToClipboard title="Copy Verdict" content={`${result.email}: ${result.verdict}`} />
        </ActionPanel>
      }
    />
  );
}

function getResultMarkdown(result: VerificationResult): string {
  return [
    `# ${result.verdict}`,
    "",
    `\`${result.email}\``,
    "",
    getDecisionCopy(result),
    "",
    `**Score:** ${result.score}`,
    "",
    `**Reason:** ${result.reason}`,
    "",
    "---",
    "",
    `**Domain:** ${result.domain}`,
    "",
    `**Provider:** ${result.provider}`,
    "",
    `**Signals:** ${getSignalSummary(result)}`,
  ].join("\n");
}

function getDecisionCopy(result: VerificationResult): string {
  if (result.verdict === "Deliverable") {
    return "This address looks safe to use. The mail server accepted the address during verification.";
  }

  if (result.verdict === "Undeliverable") {
    return "Do not use this address. Bouncer could not verify it as a reachable mailbox.";
  }

  return "Treat this address with caution. Bouncer could not return a confident deliverability result.";
}

function getVerdictIcon(verdict: string): Icon {
  if (verdict === "Deliverable") return Icon.CheckCircle;
  if (verdict === "Undeliverable") return Icon.XMarkCircle;
  return Icon.QuestionMarkCircle;
}

function formatBooleanSignal(value: string): string {
  if (value === "true") return "Yes";
  if (value === "false") return "No";
  return "Not reported";
}

function getSignalSummary(result: VerificationResult): string {
  return [
    `Disposable ${formatBooleanSignal(result.disposable)}`,
    `Free ${formatBooleanSignal(result.free)}`,
    `Accept-All ${formatBooleanSignal(result.acceptAll)}`,
  ].join(" · ");
}

async function fetchVerification(email: string, apiKey: string): Promise<VerificationResult> {
  const url = new URL(API_URL);
  url.searchParams.set("email", email);

  const response = await fetch(url, {
    headers: {
      "x-api-key": apiKey,
    },
  });

  const payload = (await response.json().catch(() => null)) as BouncerResponse | null;

  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || payload?.msg || "Request rejected");
  }

  if (!payload) {
    throw new Error("Invalid JSON response");
  }

  return normalizeResult(email, payload);
}

function normalizeResult(email: string, payload: BouncerResponse): VerificationResult {
  const status = valueOrFallback(payload.status);
  const reason = prettifyReason(payload.reason);
  const verdict = getVerdict(status);

  return {
    email,
    status,
    reason,
    domain: valueOrFallback(payload.domain?.name),
    provider: valueOrFallback(payload.provider),
    score: valueOrFallback(payload.score),
    disposable: boolOrFallback(payload.domain?.disposable),
    free: boolOrFallback(payload.domain?.free),
    acceptAll: boolOrFallback(payload.domain?.acceptAll),
    verdict: verdict.text,
    verdictColor: verdict.color,
  };
}

function getVerdict(status: string): { text: string; color: Color } {
  switch (status) {
    case "deliverable":
      return { text: "Deliverable", color: Color.Green };
    case "undeliverable":
    case "invalid_email":
    case "invalid_domain":
    case "rejected_email":
      return { text: "Undeliverable", color: Color.Red };
    default:
      return { text: "Unknown", color: Color.SecondaryText };
  }
}

function prettifyReason(reason: unknown): string {
  switch (reason) {
    case "invalid_email":
      return "Invalid email syntax";
    case "invalid_domain":
      return "Invalid or missing domain";
    case "rejected_email":
      return "Rejected by SMTP";
    case "accepted_email":
      return "Accepted by mail server";
    default:
      return valueOrFallback(reason);
  }
}

function valueOrFallback(value: unknown): string {
  if (value === undefined || value === null || value === "") return "n/a";
  return String(value);
}

function boolOrFallback(value: unknown): string {
  if (typeof value !== "boolean") return "n/a";
  return value ? "true" : "false";
}
