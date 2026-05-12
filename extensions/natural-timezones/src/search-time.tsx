import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  open,
  showToast,
} from "@raycast/api";
import { useMemo, useState } from "react";
import {
  EXAMPLES,
  HourFormat,
  TimeResult,
  defaultTimeFormat,
  displayTitle,
  parseAndResolve,
  resolveZoneInput,
} from "./time-core";

const WEB_URL = "https://time.molodtsov.me/";

export default function Command() {
  const preferences = getPreferenceValues<Preferences.SearchTime>();
  const [searchText, setSearchText] = useState("");
  const options = useMemo(() => {
    const local = preferences.localZone
      ? resolveZoneInput(preferences.localZone)
      : null;
    const hourFormat =
      preferences.hourFormat === "12" || preferences.hourFormat === "24"
        ? preferences.hourFormat
        : defaultTimeFormat();
    return { localZone: local?.zone, hourFormat };
  }, [preferences.hourFormat, preferences.localZone]);
  const { parsed, results, localZone, hourFormat } = useMemo(
    () => parseAndResolve(searchText, options),
    [searchText, options],
  );

  return (
    <List
      searchBarPlaceholder="City, country, or timezone"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      isShowingDetail={results.length > 0}
    >
      {results.length ? (
        results.map((result, index) => (
          <ResultItem
            key={`${result.target.label}-${result.target.zone}-${index}`}
            result={result}
            query={searchText}
            hourFormat={hourFormat}
          />
        ))
      ) : (
        <List.EmptyView
          icon={parsed.mode === "unknown" ? Icon.QuestionMark : Icon.Clock}
          title={searchText.trim() ? "No timezone match" : "Search timezones"}
          description={
            searchText.trim()
              ? "Try a city, country, timezone abbreviation, or one of the examples."
              : `Local timezone: ${localZone}`
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Local Timezone"
                content={localZone}
              />
              <ActionPanel.Section title="Examples">
                {EXAMPLES.slice(0, 8).map((example) => (
                  <Action
                    key={example}
                    title={example}
                    onAction={() => setSearchText(example)}
                  />
                ))}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function ResultItem({
  result,
  query,
  hourFormat,
}: {
  result: TimeResult;
  query: string;
  hourFormat: HourFormat;
}) {
  const webUrl = `${WEB_URL}?q=${encodeURIComponent(query.trim())}`;
  const detail = [
    `# ${result.time}`,
    "",
    `**${displayTitle(result.target)}**`,
    "",
    `${result.day} · ${result.date} · ${result.phase.label}`,
    "",
    `${result.relativeOffset} · ${result.zoneName}`,
    result.sourceDetail
      ? `\n---\n\n**${result.sourceDetail.title}**\n\n${result.sourceDetail.time} · ${result.sourceDetail.offset} · ${result.sourceDetail.phase}`
      : "",
  ].join("\n");

  return (
    <List.Item
      title={result.time}
      subtitle={displayTitle(result.target)}
      icon={Icon.Clock}
      accessories={[
        { text: result.relativeOffset },
        { tag: result.phase.label },
        { text: result.zoneOffset },
      ]}
      detail={
        <List.Item.Detail
          markdown={detail}
          metadata={<Metadata result={result} hourFormat={hourFormat} />}
        />
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result" content={result.copy} />
          <Action
            title="Copy Time"
            icon={Icon.Clock}
            onAction={() => copyWithToast(result.time, "Copied time")}
          />
          <Action.CopyToClipboard
            title="Copy Timezone"
            content={result.target.zone}
          />
          <Action.OpenInBrowser title="Open in Time" url={webUrl} />
          <Action
            title="Copy Time URL"
            icon={Icon.Link}
            onAction={() => copyWithToast(webUrl, "Copied URL")}
          />
          <Action
            title="Open Time Website"
            icon={Icon.Globe}
            onAction={() => open(WEB_URL)}
          />
        </ActionPanel>
      }
    />
  );
}

function Metadata({
  result,
  hourFormat,
}: {
  result: TimeResult;
  hourFormat: HourFormat;
}) {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="Place"
        text={result.target.label}
      />
      <List.Item.Detail.Metadata.Label
        title="Timezone"
        text={result.target.zone}
      />
      <List.Item.Detail.Metadata.Label
        title="UTC Offset"
        text={result.zoneName}
      />
      <List.Item.Detail.Metadata.Label
        title="Relative"
        text={result.relativeOffset}
      />
      <List.Item.Detail.Metadata.Label title="Date" text={result.date} />
      <List.Item.Detail.Metadata.Label
        title="Phase"
        text={result.phase.label}
      />
      <List.Item.Detail.Metadata.Label
        title="Hour Format"
        text={`${hourFormat}h`}
      />
    </List.Item.Detail.Metadata>
  );
}

async function copyWithToast(content: string, title: string) {
  await Clipboard.copy(content);
  await showToast({ style: Toast.Style.Success, title });
}
