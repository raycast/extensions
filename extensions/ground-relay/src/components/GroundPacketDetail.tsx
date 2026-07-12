import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Detail,
  Icon,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { renderGroundPacketMarkdown } from "../domain/markdown";
import type { GroundPacketRecord } from "../domain/types";
import { deleteGroundPacket } from "../services/ledger";
import { CorrectionForm } from "./CorrectionForm";

interface Props {
  record: GroundPacketRecord;
  onChanged?: () => void | Promise<void>;
  onDeleted?: () => void | Promise<void>;
}

export function GroundPacketDetail({ record, onChanged, onDeleted }: Props) {
  const [displayRecord, setDisplayRecord] = useState(record);
  const navigation = useNavigation();
  const markdown = renderGroundPacketMarkdown(displayRecord);

  async function handleCorrection(next: GroundPacketRecord) {
    setDisplayRecord(next);
    await onChanged?.();
  }

  async function handleDelete() {
    const confirmed = await confirmAlert({
      title: `Move “${displayRecord.draft.title}” v${displayRecord.version} to Trash?`,
      message:
        "This moves only this local version to the system Trash, where it can be recovered. Other lineage records remain intact.",
      primaryAction: {
        title: "Move Packet to Trash",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    await deleteGroundPacket(displayRecord.id);
    await onDeleted?.();
    await showToast({
      style: Toast.Style.Success,
      title: "Packet moved to Trash",
    });
    navigation.pop();
  }

  return (
    <Detail
      navigationTitle={`${displayRecord.draft.title} · v${displayRecord.version}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Correction">
            <Action.Push
              title="Append Correction"
              icon={Icon.Repeat}
              target={
                <CorrectionForm
                  base={displayRecord}
                  onComplete={handleCorrection}
                />
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Portable Export">
            <Action.CopyToClipboard
              title="Copy as Markdown"
              content={markdown}
            />
            <Action
              title="Copy as JSON"
              icon={Icon.Code}
              onAction={async () => {
                await Clipboard.copy(JSON.stringify(displayRecord, null, 2));
                await showToast({
                  style: Toast.Style.Success,
                  title: "Copied JSON",
                });
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Move This Version to Trash"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleDelete}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
