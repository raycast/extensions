import { Action, ActionPanel, Color, Icon, List, showToast } from "@raycast/api";
import { Cloud, Appliance, Signal } from "nature-remo";
import { useEffect, useRef, useState } from "react";
import { getIcon } from "../lib/icon";
import { getPreferences } from "../lib/preferences";
import { clearTimeout } from "timers";
import { titleCase } from "../lib/utils";

export function IR({ appliance }: { appliance: Appliance }) {
  return (
    <List.Item
      title={appliance.nickname}
      subtitle={appliance.device.name}
      icon={Icon.MemoryChip}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Show Details"
              target={<Signals title={appliance.nickname} signals={appliance.signals} />}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function Signals({ title, signals }: { title: string; signals: Signal[] }) {
  return (
    <List navigationTitle={title}>
      <List.Section title="Commands" subtitle={String(signals.length)}>
        {signals.map((signal) => (
          <Item key={signal.id} signal={signal} />
        ))}
      </List.Section>
    </List>
  );
}

function Item({ signal }: { signal: Signal }) {
  const [signalSent, setSignalSent] = useState<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  async function sendSignal() {
    const { apiKey } = getPreferences();
    const client = new Cloud(apiKey);

    // Visual notification
    setSignalSent(true);
    // clearTimeout signature from @types/node conflicts with the same one in lib.dom.d.ts from VS Code
    clearTimeout(timeoutRef.current as unknown as number);
    timeoutRef.current = setTimeout(() => setSignalSent(false), 3000);
    await showToast({ title: "Sent signal", message: signal.name });

    await client.sendSignal(signal.id);
  }

  useEffect(() => () => clearTimeout(timeoutRef.current as unknown as number), []);

  return (
    <List.Item
      title={titleCase(signal.name)}
      icon={signalSent ? { source: Icon.Checkmark, tintColor: Color.Green } : getIcon(signal.image)}
      actions={
        <ActionPanel>
          <Action title="Send Signal" onAction={sendSignal} />
        </ActionPanel>
      }
    />
  );
}
