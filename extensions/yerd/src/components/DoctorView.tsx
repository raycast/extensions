import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { runYerd, runYerdDoctor, TIMEOUTS } from "../yerd/cli";

function failureTitle(e: unknown): string {
  return (e as { userMessage?: string }).userMessage ?? "Failed";
}

// Severity values observed live: "ok" | "warn"; "fail" documented for broken
// checks (doctor exits 1 when present). Unknown severities render as warn.
const SEVERITY_ICONS: Record<string, { source: Icon; tintColor: Color }> = {
  ok: { source: Icon.CheckCircle, tintColor: Color.Green },
  warn: { source: Icon.Warning, tintColor: Color.Yellow },
  fail: { source: Icon.XMarkCircle, tintColor: Color.Red },
};

export function DoctorView() {
  const { isLoading, data, revalidate } = useCachedPromise(
    () => runYerdDoctor({ timeoutMs: TIMEOUTS.doctor }),
    [],
    { keepPreviousData: true },
  );

  async function runFix() {
    const ok = await confirmAlert({
      title: "Apply Repairs?",
      message:
        "Doctor will automatically apply safe, unprivileged fixes (e.g. restart a crashed FPM pool).",
      primaryAction: { title: "Apply", style: Alert.ActionStyle.Default },
    });
    if (!ok) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Running doctor fix…",
    });
    try {
      await runYerd(["doctor", "fix"], { timeoutMs: 120_000 });
      toast.style = Toast.Style.Success;
      toast.title = "Fixes applied";
      revalidate();
    } catch (e) {
      await showFailureToast(e, { title: failureTitle(e) });
    }
  }

  const findings = data?.items ?? [];
  const hasFailures = findings.some((f) => f.severity === "fail");

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter findings…">
      {findings.length > 0 && (
        <List.Section
          title={`Doctor — ${findings.length} finding${findings.length !== 1 ? "s" : ""}${hasFailures ? " (FAIL)" : ""}`}
        >
          {findings.map((f) => {
            const iconConfig =
              SEVERITY_ICONS[f.severity] ?? SEVERITY_ICONS.warn;
            return (
              <List.Item
                key={f.code}
                icon={{
                  source: iconConfig.source,
                  tintColor: iconConfig.tintColor,
                }}
                title={f.title}
                subtitle={f.detail}
                accessories={[
                  { tag: { value: f.severity, color: iconConfig.tintColor } },
                ]}
                actions={
                  <ActionPanel>
                    {f.remedy && (
                      <Action.CopyToClipboard
                        title="Copy Remedy"
                        content={f.remedy}
                      />
                    )}
                    <Action
                      title="Apply Fixes (Doctor Fix)"
                      icon={Icon.Hammer}
                      onAction={runFix}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.RotateClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={revalidate}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
      {!isLoading && findings.length === 0 && (
        <List.EmptyView
          title="All checks passed"
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
        />
      )}
    </List>
  );
}
