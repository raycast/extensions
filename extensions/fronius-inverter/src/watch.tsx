import { LaunchType, MenuBarExtra, Toast, getPreferenceValues, launchCommand, open, showToast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizeBaseUrlOrUndefined } from "./api";
import { formatCompactPower, formatTimestamp } from "./format";
import { createMetricSections } from "./metrics";
import { FroniusSnapshot, hasInverterError, inverterDisplayName } from "./model";
import { createRefreshController, RefreshResult } from "./refresh-controller";
import { fetchFroniusSnapshot } from "./service";

export default function Watch() {
  const { baseUrl } = getPreferenceValues<Preferences>();
  const [snapshot, setSnapshot] = useState<FroniusSnapshot>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  const performLoad = useCallback(async (): Promise<RefreshResult> => {
    setIsLoading(true);
    try {
      setSnapshot(await fetchFroniusSnapshot(baseUrl));
      setErrorMessage(undefined);
      return {};
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(message);
      return { errorMessage: message };
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl]);
  const showRefreshResult = useCallback(async ({ errorMessage: refreshError }: RefreshResult) => {
    await showToast(
      refreshError
        ? { style: Toast.Style.Failure, title: "Could not refresh Fronius data", message: refreshError }
        : { style: Toast.Style.Success, title: "Fronius data refreshed" },
    );
  }, []);
  const loadData = useMemo(
    () => createRefreshController(performLoad, showRefreshResult),
    [performLoad, showRefreshResult],
  );
  const browserUrl = normalizeBaseUrlOrUndefined(baseUrl);

  useEffect(() => {
    void loadData();
    const interval = setInterval(() => void loadData(), 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  const pvPower = formatCompactPower(snapshot?.site.P_PV);
  const title = errorMessage
    ? "⚠"
    : snapshot?.errorCount
      ? `⚠ ${snapshot.errorCount}`
      : pvPower
        ? `☀ ${pvPower}`
        : isLoading
          ? "…"
          : "✓";
  const tooltip = errorMessage
    ? `Fronius unavailable: ${errorMessage}`
    : snapshot
      ? `Fronius online · Updated ${formatTimestamp(snapshot.timestamp)}`
      : "Loading Fronius data";

  return (
    <MenuBarExtra title={title} tooltip={tooltip} isLoading={isLoading}>
      {errorMessage ? (
        <MenuBarExtra.Section title="Connection">
          <MenuBarExtra.Item title="Inverter unavailable" subtitle={errorMessage} />
        </MenuBarExtra.Section>
      ) : null}
      {snapshot ? (
        <>
          <MenuBarExtra.Section title={`Inverters · ${formatTimestamp(snapshot.timestamp)}`}>
            {snapshot.inverters.map((inverter) => {
              const { id, info } = inverter;
              return (
                <MenuBarExtra.Item
                  key={id}
                  title={inverterDisplayName(inverter)}
                  subtitle={`${info.InverterState} · ${formatCompactPower(info.PVPower) ?? "N/A"} connected PV · ${hasInverterError(info) ? `Error ${info.ErrorCode}` : "OK"}`}
                />
              );
            })}
          </MenuBarExtra.Section>
          {createMetricSections(snapshot).map((section) => (
            <MenuBarExtra.Section key={section.title} title={section.title}>
              {section.items.map((item) => (
                <MenuBarExtra.Item
                  key={`${section.title}:${item.label}`}
                  title={`${item.icon} ${item.label}`}
                  subtitle={item.value}
                />
              ))}
            </MenuBarExtra.Section>
          ))}
          {snapshot.warnings.length > 0 ? (
            <MenuBarExtra.Section title="Partial Data">
              {snapshot.warnings.map((warning) => (
                <MenuBarExtra.Item key={warning} title={warning} />
              ))}
            </MenuBarExtra.Section>
          ) : null}
        </>
      ) : null}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Show Dashboard"
          onAction={() => launchCommand({ name: "dashboard", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Refresh" onAction={() => loadData(true)} />
        {browserUrl ? (
          <MenuBarExtra.Item title="Open Inverter Web Interface" onAction={() => open(browserUrl)} />
        ) : null}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
