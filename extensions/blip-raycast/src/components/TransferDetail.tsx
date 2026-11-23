import { Detail, useNavigation } from "@raycast/api";
import { dirname } from "node:path";
import { useBlipState } from "../hooks/useBlipState";
import { tildify } from "../lib/content";
import { formatBytes, formatSpeed, toTransferRow } from "../lib/model";
import { BlipErrorView } from "./BlipErrorView";
import { openablePath, percent, statusColor, TransferActions } from "./TransferActions";

/** Live details for one transfer, with the same actions as its row. */
export function TransferDetail({ id }: { id: string }) {
  const { pop } = useNavigation();
  // The list underneath already warns about a lost connection.
  const { state, error } = useBlipState({ warnOnDisconnect: false });
  const transfer = state?.transfers?.[id];
  if (error && !state) return <BlipErrorView error={error} />;
  if (!state || !transfer) {
    return (
      <Detail
        navigationTitle="Transfer Details"
        isLoading={!state}
        markdown={state ? "This transfer is no longer in Blip's history." : ""}
      />
    );
  }
  const row = toTransferRow(state, transfer);
  const items = Object.keys(transfer.archive_stub?.items ?? {}).sort();
  const speed = row.isActive ? formatSpeed(transfer.stats?.kbps) : undefined;
  const escape = (text: string) => text.replace(/([\\`*_[\]<>#])/g, "\\$1");
  return (
    <Detail
      navigationTitle="Transfer Details"
      markdown={`## ${escape(row.title)}${items.length > 1 ? `\n\n${items.map((name) => `- ${escape(name)}`).join("\n")}` : ""}`}
      actions={<TransferActions row={row} path={openablePath(row)} inDetail onRemoved={pop} />}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={row.statusLabel} color={statusColor(row)} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title={row.incoming ? "From" : "To"} text={row.peerName} />
          {row.totalBytes > 0 && <Detail.Metadata.Label title="Size" text={formatBytes(row.totalBytes)} />}
          {row.isOpen && !row.needsResponse && percent(row) && (
            <Detail.Metadata.Label title="Progress" text={percent(row)} />
          )}
          {speed && <Detail.Metadata.Label title="Speed" text={speed} />}
          {row.errorMessage && <Detail.Metadata.Label title="Error" text={row.errorMessage} />}
          {row.localPaths[0] && <Detail.Metadata.Label title="Location" text={tildify(dirname(row.localPaths[0]))} />}
          {row.updatedAt && (
            <Detail.Metadata.Label title="Updated" text={new Date(row.updatedAt).toLocaleString("en-US")} />
          )}
        </Detail.Metadata>
      }
    />
  );
}
