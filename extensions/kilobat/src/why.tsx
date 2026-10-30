import { Action, ActionPanel, Detail, Icon, Keyboard, LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { checkingCard, whyCard } from "./cards";
import { ErrorView, KilobatAppAction } from "./components";
import { image } from "./draw";
import { kilobat, WhyReport } from "./kilobat";

export function reportText(report: WhyReport) {
  return [
    report.verdict,
    "",
    ...report.steps.map((step) => `${step.status.toUpperCase().padEnd(7)} ${step.layer}: ${step.detail}`),
    ...(report.next ? ["", report.next] : []),
  ].join("\n");
}

export default function Command(props: LaunchProps<{ arguments: Arguments.Why }>) {
  const host = props.arguments.host.trim();
  const { data, isLoading, error, revalidate } = usePromise(
    (target: string) => kilobat<WhyReport>(["why", target, "--json"], 60_000),
    [host],
  );
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!isLoading) return;
    const timer = setInterval(() => setTick((value) => value + 1), 350);
    return () => clearInterval(timer);
  }, [isLoading]);

  if (error && !data) return <ErrorView error={error} onRetry={revalidate} />;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Why Can't I Reach ${host}`}
      markdown={image(data && !isLoading ? whyCard(data) : checkingCard(host, tick), 700, `Checking ${host}`)}
      actions={
        <ActionPanel>
          {data ? <Action.CopyToClipboard title="Copy Report" content={reportText(data)} /> : null}
          <Action
            title="Check Again"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          {data ? <Action.OpenInBrowser title="Open in Browser" url={data.target} /> : null}
          <KilobatAppAction title="Open Health in Kilobat" link="open/health" />
        </ActionPanel>
      }
    />
  );
}
