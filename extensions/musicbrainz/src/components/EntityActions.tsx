import { Action, ActionPanel, Icon } from "@raycast/api";

import { getEntityUrl } from "../api/musicbrainz";
import { EntityType } from "../types";

interface EntityActionsProps {
  entityType: EntityType;
  mbid: string;
  name: string;
  detailTarget?: React.ReactNode;
  onViewDetails?: () => void;
  onPop?: () => void;
  barcode?: string;
  labelCode?: string;
  isnis?: string[];
  ipis?: string[];
  isrcs?: string[];
  iswcs?: string[];
  children?: React.ReactNode;
}

export function EntityActions({
  entityType,
  mbid,
  name,
  detailTarget,
  onViewDetails,
  onPop,
  barcode,
  labelCode,
  isnis,
  ipis,
  isrcs,
  iswcs,
  children,
}: EntityActionsProps) {
  const url = getEntityUrl(entityType, mbid);

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {detailTarget && (
          <Action.Push
            title="View Details"
            icon={Icon.Eye}
            target={detailTarget}
            onPush={onViewDetails}
            onPop={onPop}
          />
        )}
        <Action.CopyToClipboard title="Copy MBID" content={mbid} shortcut={{ modifiers: ["cmd"], key: "." }} />
        {(entityType === "artist" || entityType === "release-group") && (
          <Action.CopyToClipboard
            title="Copy Lidarr Search"
            content={`lidarr:${mbid}`}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
        )}
      </ActionPanel.Section>
      {children}
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open in MusicBrainz" url={url} shortcut={{ modifiers: ["cmd"], key: "o" }} />
        <Action.CopyToClipboard
          title="Copy MusicBrainz URL"
          content={url}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />
        <Action.CopyToClipboard title="Copy Name" content={name} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
        {barcode && <Action.CopyToClipboard title="Copy Barcode" content={barcode} icon={Icon.BarCode} />}
        {labelCode && <Action.CopyToClipboard title="Copy Label Code" content={labelCode} />}
      </ActionPanel.Section>
      {((isnis && isnis.length > 0) ||
        (ipis && ipis.length > 0) ||
        (isrcs && isrcs.length > 0) ||
        (iswcs && iswcs.length > 0)) && (
        <ActionPanel.Section title="Identifiers">
          {isnis?.map((v, i) => (
            <Action.CopyToClipboard key={`isni-${i}`} title={`Copy ISNI: ${v}`} content={v} />
          ))}
          {ipis?.map((v, i) => (
            <Action.CopyToClipboard key={`ipi-${i}`} title={`Copy IPI: ${v}`} content={v} />
          ))}
          {isrcs?.map((v, i) => (
            <Action.CopyToClipboard key={`isrc-${i}`} title={`Copy ISRC: ${v}`} content={v} />
          ))}
          {iswcs?.map((v, i) => (
            <Action.CopyToClipboard key={`iswc-${i}`} title={`Copy ISWC: ${v}`} content={v} />
          ))}
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}
