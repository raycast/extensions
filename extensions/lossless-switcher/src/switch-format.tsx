import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  showHUD,
  showToast,
} from "@raycast/api";
import { listFormats, setFormat, type AudioFormat } from "./lib/audio-format";
import { ensureInstalled } from "./lib/daemon";

export default function SwitchFormat() {
  const [formats, setFormats] = useState<AudioFormat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await ensureInstalled();
        const list = await listFormats();
        setFormats(list);
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Couldn't list formats",
          message: (err as Error).message,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const current = formats.find((f) => f.isCurrent);
  const others = formats.filter((f) => !f.isCurrent);

  return (
    <List isLoading={loading} searchBarPlaceholder="Filter formats">
      {current && (
        <List.Section title="Current">
          <List.Item
            key={fmtKey(current)}
            title={current.label}
            icon={Icon.CheckCircle}
            accessories={[{ text: "applied" }]}
          />
        </List.Section>
      )}
      <List.Section title="Available">
        {others.map((f) => (
          <List.Item
            key={fmtKey(f)}
            title={f.label}
            icon={Icon.Speaker}
            actions={
              <ActionPanel>
                <Action
                  title={`Set ${f.label}`}
                  icon={Icon.Check}
                  onAction={async () => {
                    try {
                      await setFormat(f);
                      await showHUD(`→ ${f.label}`);
                    } catch (err) {
                      showToast({
                        style: Toast.Style.Failure,
                        title: "Couldn't apply format",
                        message: (err as Error).message,
                      });
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function fmtKey(f: AudioFormat): string {
  return `${f.rate}-${f.bits}-${f.isFloat ? "float" : "int"}`;
}
