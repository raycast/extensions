import { Action, ActionPanel, Color, Icon, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizeBaseUrlOrUndefined } from "./api";
import { formatCompactPower, formatTimestamp } from "./format";
import { createMetricSections } from "./metrics";
import { FroniusSnapshot, hasInverterError, inverterDisplayName } from "./model";
import { fetchFroniusSnapshot } from "./service";
import { createSingleFlight } from "./single-flight";

interface DataActionsProps {
  browserUrl: string | undefined;
  onRefresh: () => Promise<void>;
}

function DataActions({ browserUrl, onRefresh }: DataActionsProps) {
  return (
    <ActionPanel>
      <Action title="Refresh Data" icon={Icon.ArrowClockwise} onAction={onRefresh} />
      {browserUrl ? <Action.OpenInBrowser title="Open Inverter Web Interface" url={browserUrl} /> : null}
    </ActionPanel>
  );
}

export default function Dashboard() {
  const { baseUrl } = getPreferenceValues<Preferences>();
  const [snapshot, setSnapshot] = useState<FroniusSnapshot>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  const performLoad = useCallback(async () => {
    setIsLoading(true);
    try {
      setSnapshot(await fetchFroniusSnapshot(baseUrl));
      setErrorMessage(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(message);
      await showToast({ style: Toast.Style.Failure, title: "Could not load Fronius data", message });
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl]);
  const loadData = useMemo(() => createSingleFlight(performLoad), [performLoad]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const metricSections = snapshot ? createMetricSections(snapshot) : [];
  const actions = <DataActions browserUrl={normalizeBaseUrlOrUndefined(baseUrl)} onRefresh={loadData} />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search inverter data…">
      {errorMessage ? (
        <List.Section title="Connection">
          <List.Item
            title="Inverter unavailable"
            subtitle={errorMessage}
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            actions={actions}
          />
        </List.Section>
      ) : null}
      {snapshot ? (
        <>
          <List.Section title="Inverters" subtitle={`Updated ${formatTimestamp(snapshot.timestamp)}`}>
            {snapshot.inverters.map((inverter) => {
              const { id, info } = inverter;
              const hasError = hasInverterError(info);
              return (
                <List.Item
                  key={id}
                  title={inverterDisplayName(inverter)}
                  subtitle={`${info.InverterState} · ${formatCompactPower(info.PVPower) ?? "N/A"} connected PV`}
                  icon={{
                    source: hasError ? Icon.ExclamationMark : Icon.CheckCircle,
                    tintColor: hasError ? Color.Red : Color.Green,
                  }}
                  accessories={[{ text: hasError ? `Error ${info.ErrorCode}` : "OK" }]}
                  actions={actions}
                />
              );
            })}
          </List.Section>
          {metricSections.map((section) => (
            <List.Section key={section.title} title={section.title}>
              {section.items.map((item) => (
                <List.Item
                  key={`${section.title}:${item.label}`}
                  title={`${item.icon} ${item.label}`}
                  accessories={[{ text: item.value }]}
                  actions={actions}
                />
              ))}
            </List.Section>
          ))}
          {snapshot.warnings.length > 0 ? (
            <List.Section title="Partial Data">
              {snapshot.warnings.map((warning) => (
                <List.Item
                  key={warning}
                  title={warning}
                  icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
                  actions={actions}
                />
              ))}
            </List.Section>
          ) : null}
        </>
      ) : null}
      {!snapshot && !isLoading && !errorMessage ? <List.EmptyView title="No Fronius data" actions={actions} /> : null}
    </List>
  );
}
