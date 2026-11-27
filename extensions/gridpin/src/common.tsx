// The parts both commands share: finding the program and its sheets, the country dropdown, the empty states and the
// actions on one answer.
import { Action, ActionPanel, Icon, Keyboard, List, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import {
  INSTALL,
  Hit,
  Sheet,
  address,
  appleMaps,
  environment,
  fetchCommand,
  findGridpin,
  listSheets,
  megabytes,
  openStreetMap,
  pickSheet,
  point,
  subtitle,
} from "./gridpin";

export type Setup =
  | { kind: "loading" }
  | { kind: "no-program" }
  | { kind: "error"; message: string }
  | { kind: "no-sheet"; sheets: Sheet[] }
  | { kind: "ready"; bin: string; env: NodeJS.ProcessEnv; sheets: Sheet[]; sheet: Sheet };

export function useSetup(): { setup: Setup; setCountry: (code: string) => void } {
  const prefs = getPreferenceValues<Preferences>();
  const [chosen, setCountry] = useCachedState<string>("country", "");
  const bin = findGridpin(prefs.gridpinPath);
  const env = environment(prefs.sheetsFolder);
  const { data, error, isLoading } = usePromise(async (b?: string) => (b ? listSheets(b, env) : undefined), [bin]);
  if (!bin) return { setup: { kind: "no-program" }, setCountry };
  if (error) return { setup: { kind: "error", message: error.message }, setCountry };
  if (isLoading || !data) return { setup: { kind: "loading" }, setCountry };
  const sheet = pickSheet(data, chosen, prefs.country);
  if (!sheet) return { setup: { kind: "no-sheet", sheets: data }, setCountry };
  return { setup: { kind: "ready", bin, env, sheets: data, sheet }, setCountry };
}

export function CountryDropdown({ setup, onChange }: { setup: Setup; onChange: (code: string) => void }) {
  if (setup.kind !== "ready") return null;
  return (
    <List.Dropdown tooltip="Country sheet" value={setup.sheet.code} onChange={onChange}>
      {setup.sheets
        .filter((s) => s.downloaded)
        .map((s) => (
          <List.Dropdown.Item key={s.code} title={s.name} value={s.code} />
        ))}
    </List.Dropdown>
  );
}

/** A query that failed (an unreadable sheet, a timeout) is said to have failed, never shown as "No answer". */
export function QueryErrorView({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title="GridPin did not answer"
      description={error.message}
      actions={
        <ActionPanel>
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={retry} />
        </ActionPanel>
      }
    />
  );
}

/** What to show when there is nothing to ask yet; undefined when the command can ask. */
export function SetupView({ setup }: { setup: Setup }) {
  switch (setup.kind) {
    case "no-program":
      return (
        <List.EmptyView
          icon={Icon.Download}
          title="GridPin is not installed"
          description={`It answers on this Mac, without a network. Install it with Homebrew: ${INSTALL}`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Install Command" content={INSTALL} />
              <Action title="Set the Program Path" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      );
    case "error":
      return <List.EmptyView icon={Icon.Warning} title="GridPin did not answer" description={setup.message} />;
    case "no-sheet":
      return null; // a list of the sheets to download, drawn by NoSheetItems
    default:
      return undefined;
  }
}

export function NoSheetItems({ sheets }: { sheets: Sheet[] }) {
  return (
    <List.Section title="No country sheet is downloaded: copy the command for one and run it in a terminal">
      {sheets.map((s) => (
        <List.Item
          key={s.code}
          icon={Icon.Download}
          title={s.name}
          subtitle={fetchCommand(s.code)}
          accessories={[{ text: megabytes(s.size) }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Download Command" content={fetchCommand(s.code)} />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}

export function HitItem({ hit, index }: { hit: Hit; index: number }) {
  const where = address(hit) || point(hit);
  return (
    <List.Item
      icon={hit.weak ? Icon.QuestionMarkCircle : Icon.Pin}
      title={where}
      subtitle={subtitle(hit)}
      accessories={[{ text: point(hit) }]}
      keywords={[String(index)]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Latitude, Longitude" content={point(hit)} />
          <Action.OpenInBrowser title="Open in Apple Maps" url={appleMaps(hit)} />
          <Action.OpenInBrowser title="Open in OpenStreetMap" url={openStreetMap(hit)} />
          <Action.CopyToClipboard title="Copy Address" content={where} shortcut={Keyboard.Shortcut.Common.CopyName} />
        </ActionPanel>
      }
    />
  );
}
