import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  displayLabel,
  getCurrentMacbookOrigin,
  identifyDisplay,
  listDisplays,
  loadConfig,
  openDisplayArrangement,
  saveConfig,
  type Display,
  type SavedConfig,
} from "./lib";

export default function Command() {
  const { pop } = useNavigation();
  const [loading, setLoading] = useState(true);
  const [displays, setDisplays] = useState<Display[]>([]);
  const [externalId, setExternalId] = useState<string>("");
  const [macbookId, setMacbookId] = useState<string>("");
  const [originSideBySide, setOriginSideBySide] = useState<string>("");
  const [originUpAndDown, setOriginUpAndDown] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const list = await listDisplays();
      setDisplays(list);
      const saved = await loadConfig();
      const guessMb = saved.macbookDisplayId ?? list.find((d) => d.isMacBook)?.id ?? "";
      const guessExt = saved.externalDisplayId ?? list.find((d) => d.id !== guessMb)?.id ?? "";
      setMacbookId(list.some((d) => d.id === guessMb) ? guessMb : "");
      setExternalId(list.some((d) => d.id === guessExt) ? guessExt : "");
      setOriginSideBySide(saved.macbookOriginSideBySide ?? "");
      setOriginUpAndDown(saved.macbookOriginUpAndDown ?? "");
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        /ENOENT|not found|No such file/i.test(msg)
          ? "displayplacer not found. Install with `brew install displayplacer`, then come back."
          : msg,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function identify(id: string) {
    const d = displays.find((x) => x.id === id);
    if (!d) return;
    const t = await showToast({ style: Toast.Style.Animated, title: `Identifying ${displayLabel(d)}…` });
    try {
      await identifyDisplay(d);
      t.style = Toast.Style.Success;
      t.title = "Cursor shaken on that display";
    } catch (e) {
      t.style = Toast.Style.Failure;
      t.title = "Couldn't identify display";
      t.message = e instanceof Error ? e.message : String(e);
    }
  }

  async function captureOrigin(slot: "side-by-side" | "up-and-down") {
    if (!macbookId) {
      await showToast({ style: Toast.Style.Failure, title: "Pick the MacBook display first" });
      return;
    }
    const t = await showToast({ style: Toast.Style.Animated, title: "Reading current MacBook origin…" });
    try {
      const origin = await getCurrentMacbookOrigin(macbookId);
      if (!origin) throw new Error("MacBook display not found.");
      if (slot === "side-by-side") setOriginSideBySide(origin);
      else setOriginUpAndDown(origin);
      t.style = Toast.Style.Success;
      t.title = `Captured ${slot}: ${origin}`;
    } catch (e) {
      t.style = Toast.Style.Failure;
      t.title = "Capture failed";
      t.message = e instanceof Error ? e.message : String(e);
    }
  }

  async function submit() {
    if (!externalId || !macbookId) {
      await showToast({ style: Toast.Style.Failure, title: "Select both displays" });
      return;
    }
    if (externalId === macbookId) {
      await showToast({ style: Toast.Style.Failure, title: "External and MacBook can't be the same" });
      return;
    }
    if (!originSideBySide || !originUpAndDown) {
      await showToast({ style: Toast.Style.Failure, title: "Capture both MacBook origins" });
      return;
    }
    const cfg: SavedConfig = {
      externalDisplayId: externalId,
      macbookDisplayId: macbookId,
      macbookOriginSideBySide: originSideBySide,
      macbookOriginUpAndDown: originUpAndDown,
    };
    await saveConfig(cfg);
    await showToast({ style: Toast.Style.Success, title: "Configuration saved" });
    pop();
  }

  if (error) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={refresh} />
          </ActionPanel>
        }
      >
        <Form.Description title="Error" text={error} />
      </Form>
    );
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Configuration" icon={Icon.Check} onSubmit={submit} />
          <ActionPanel.Section title="Identify">
            <Action
              title="Identify External Display"
              icon={Icon.Eye}
              shortcut={{ modifiers: ["cmd"], key: "1" }}
              onAction={() => identify(externalId)}
            />
            {/* eslint-disable-next-line @raycast/prefer-title-case */}
            <Action
              title="Identify MacBook Display"
              icon={Icon.Eye}
              shortcut={{ modifiers: ["cmd"], key: "2" }}
              onAction={() => identify(macbookId)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Origins">
            <Action
              title="Open Display Arrangement"
              icon={Icon.AppWindow}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={openDisplayArrangement}
            />
            <Action
              title="Capture Current as Side-by-side"
              icon={Icon.ArrowRight}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={() => captureOrigin("side-by-side")}
            />
            <Action
              title="Capture Current as Up-and-down"
              icon={Icon.ArrowDown}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
              onAction={() => captureOrigin("up-and-down")}
            />
          </ActionPanel.Section>
          <Action title="Refresh Displays" icon={Icon.ArrowClockwise} onAction={refresh} />
        </ActionPanel>
      }
    >
      <Form.Description text="Pick which physical display is which. Use ⌘1 / ⌘2 to shake the cursor on the highlighted display to confirm." />

      <Form.Dropdown id="external" title="External Display" value={externalId} onChange={setExternalId}>
        {displays.map((d) => (
          <Form.Dropdown.Item key={d.id} value={d.id} title={displayLabel(d)} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="macbook" title="MacBook Display" value={macbookId} onChange={setMacbookId}>
        {displays.map((d) => (
          <Form.Dropdown.Item key={d.id} value={d.id} title={displayLabel(d)} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description
        title="MacBook origins"
        text="Open Display Arrangement (⌘D), drag the MacBook into the layout you want, then capture it with ⌘S (side-by-side) or ⌘U (up-and-down)."
      />

      <Form.TextField
        id="side"
        title="Side-by-Side Origin"
        placeholder="(-1512,360) — captured automatically"
        value={originSideBySide}
        onChange={setOriginSideBySide}
      />

      <Form.TextField
        id="up"
        title="Up-and-Down Origin"
        placeholder="(949,1440) — captured automatically"
        value={originUpAndDown}
        onChange={setOriginUpAndDown}
      />
    </Form>
  );
}
