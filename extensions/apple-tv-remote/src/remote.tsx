import { useCallback, useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Color, Form, Grid, Icon, Keyboard, Toast, showToast, useNavigation } from "@raycast/api";
import { AppleTVConnection, RemoteKey, disconnect, onConnectionLost, sendKey, setText } from "@bharper/atv-js";
import { openConnection } from "./lib/connection";
import { NotPairedError, showErrorToast } from "./lib/errors";
import { appSwitcher, controlCenter, longPressSelect, skipBy, startScreensaver } from "./lib/companion-extras";

type Status = "connecting" | "connected" | "reconnecting" | "disconnected" | "not-paired";

type DeviceAction = (conn: AppleTVConnection) => Promise<void>;

/**
 * A visual Apple TV remote: a 3-column grid laid out like the physical remote,
 * clickable with the mouse, holding ONE live Companion connection so every
 * press is instant. Keyboard layers on top:
 *  - Bare keys via search interception: WASD/HJKL move, F select, Space ⏯.
 *  - ⌥-shortcuts for every action, regardless of selection.
 */
export default function Remote() {
  const connRef = useRef<AppleTVConnection | null>(null);
  // The connection attempt currently in flight, shared by every caller so a
  // burst of presses during the handshake reuses one attempt instead of each
  // opening — and leaking — its own connection.
  const establishingRef = useRef<Promise<AppleTVConnection | null> | null>(null);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<Status>("connecting");
  const [deviceName, setDeviceName] = useState<string>("Apple TV");
  const { push } = useNavigation();

  // Open (or reopen) the single persistent connection. `openConnection` can take
  // up to the connect timeout (~8s), during which `connRef.current` is null;
  // without coalescing, every key pressed in that window would launch another
  // `openConnection` and abandon the loser's socket. So concurrent callers share
  // one in-flight promise, and stale connections are torn down deterministically.
  const establish = useCallback(async (): Promise<AppleTVConnection | null> => {
    if (establishingRef.current) return establishingRef.current;

    const attempt = (async (): Promise<AppleTVConnection | null> => {
      // Retire any existing connection up front (the ref is only non-null here
      // on a manual reconnect over a live connection). Tearing it down *before*
      // opening the replacement means no in-flight action keeps using a socket
      // we're about to drop, and a failed reconnect can't leak the old one.
      const previous = connRef.current;
      connRef.current = null;
      if (previous) disconnect(previous);

      setStatus((s) => (s === "connected" ? "reconnecting" : "connecting"));
      try {
        const conn = await openConnection();
        if (!mountedRef.current) {
          // Unmounted mid-handshake: dispose the socket instead of leaking it.
          disconnect(conn);
          return null;
        }
        connRef.current = conn;
        setDeviceName(conn.device.name);
        setStatus("connected");
        onConnectionLost(conn, () => {
          // Only react to drops of the connection that's still active; a stale
          // connection's callback (incl. the one our own disconnect triggers)
          // must not clobber a newer live connection.
          if (connRef.current === conn) {
            connRef.current = null;
            setStatus("disconnected");
          }
        });
        return conn;
      } catch (error) {
        if (mountedRef.current) {
          setStatus(error instanceof NotPairedError ? "not-paired" : "disconnected");
          await showErrorToast(error);
        }
        return null;
      } finally {
        establishingRef.current = null;
      }
    })();

    establishingRef.current = attempt;
    return attempt;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void establish();
    return () => {
      mountedRef.current = false;
      // Null the ref before disconnecting so the lost-callback's identity check
      // fails and we don't setState on the unmounted component.
      const conn = connRef.current;
      connRef.current = null;
      if (conn) disconnect(conn);
    };
  }, [establish]);

  const run = useCallback(
    async (action: DeviceAction) => {
      const conn = connRef.current ?? (await establish());
      if (!conn) return;
      try {
        await action(conn);
      } catch (error) {
        await showErrorToast(error);
      }
    },
    [establish],
  );

  const press = useCallback((key: RemoteKey) => run((conn) => sendKey(conn, key)), [run]);

  const pushTypeText = useCallback(() => {
    push(<TypeTextForm connRef={connRef} />);
  }, [push]);

  // Bare-key layer: typed characters are button presses.
  const handleTyped = useCallback(
    (text: string) => {
      for (const ch of text.toLowerCase()) {
        const map: Record<string, () => void> = {
          w: () => void press(RemoteKey.Up),
          k: () => void press(RemoteKey.Up),
          s: () => void press(RemoteKey.Down),
          j: () => void press(RemoteKey.Down),
          a: () => void press(RemoteKey.Left),
          h: () => void press(RemoteKey.Left),
          d: () => void press(RemoteKey.Right),
          l: () => void press(RemoteKey.Right),
          f: () => void press(RemoteKey.Select),
          g: () => void press(RemoteKey.Select),
          " ": () => void press(RemoteKey.PlayPause),
          b: () => void press(RemoteKey.Menu),
          q: () => void press(RemoteKey.Home),
          v: () => void run(longPressSelect),
          x: () => void run(appSwitcher),
          c: () => void run(controlCenter),
          "[": () => void press(RemoteKey.Previous),
          "]": () => void press(RemoteKey.Next),
          ",": () => void run((conn) => skipBy(conn, -10)),
          ".": () => void run((conn) => skipBy(conn, 10)),
          "-": () => void press(RemoteKey.VolumeDown),
          "=": () => void press(RemoteKey.VolumeUp),
          "+": () => void press(RemoteKey.VolumeUp),
          t: () => pushTypeText(),
        };
        map[ch]?.();
      }
    },
    [press, run, pushTypeText],
  );

  const statusLabel =
    status === "connected"
      ? "Connected"
      : status === "connecting" || status === "reconnecting"
        ? "Connecting…"
        : status === "not-paired"
          ? "Not Paired"
          : "Disconnected";

  // Shared shortcut actions available from every cell.
  const sharedShortcuts = (
    <>
      <ActionPanel.Section title="Navigate (⌥)">
        <Action
          title="Up"
          icon={Icon.ArrowUp}
          shortcut={{ modifiers: ["opt"], key: "arrowUp" }}
          onAction={() => press(RemoteKey.Up)}
        />
        <Action
          title="Down"
          icon={Icon.ArrowDown}
          shortcut={{ modifiers: ["opt"], key: "arrowDown" }}
          onAction={() => press(RemoteKey.Down)}
        />
        <Action
          title="Left"
          icon={Icon.ArrowLeft}
          shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
          onAction={() => press(RemoteKey.Left)}
        />
        <Action
          title="Right"
          icon={Icon.ArrowRight}
          shortcut={{ modifiers: ["opt"], key: "arrowRight" }}
          onAction={() => press(RemoteKey.Right)}
        />
        <Action
          title="Select"
          icon={Icon.CircleFilled}
          shortcut={{ modifiers: ["opt"], key: "return" }}
          onAction={() => press(RemoteKey.Select)}
        />
        <Action
          title="Back"
          icon={Icon.Undo}
          shortcut={{ modifiers: ["opt"], key: "backspace" }}
          onAction={() => press(RemoteKey.Menu)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="More (⌥)">
        <Action
          title="Play/Pause"
          icon={Icon.PlayFilled}
          shortcut={{ modifiers: ["opt"], key: "p" }}
          onAction={() => press(RemoteKey.PlayPause)}
        />
        <Action
          title="Start Screensaver"
          icon={Icon.Moon}
          shortcut={{ modifiers: ["opt"], key: "s" }}
          onAction={() => run(startScreensaver)}
        />
        <Action
          title="Reconnect"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={establish}
        />
      </ActionPanel.Section>
    </>
  );

  interface Cell {
    id: string;
    icon: Icon | "blank";
    title: string;
    tint?: Color;
    action?: DeviceAction | "type-text";
  }

  const B = (id: string): Cell => ({ id, icon: "blank", title: "" });

  const cells: Cell[] = [
    // Row 1
    B("b1"),
    { id: "ctx", icon: Icon.BulletPoints, title: "Hold · V", action: longPressSelect },
    {
      id: "up",
      icon: Icon.ChevronUp,
      title: "Up · W",
      tint: Color.PrimaryText,
      action: (c) => sendKey(c, RemoteKey.Up),
    },
    { id: "switcher", icon: Icon.AppWindowGrid2x2, title: "Apps · X", action: appSwitcher },
    B("b2"),
    // Row 2
    B("b3"),
    {
      id: "left",
      icon: Icon.ChevronLeft,
      title: "Left · A",
      tint: Color.PrimaryText,
      action: (c) => sendKey(c, RemoteKey.Left),
    },
    {
      id: "select",
      icon: Icon.CircleFilled,
      title: "Select · F",
      tint: Color.Blue,
      action: (c) => sendKey(c, RemoteKey.Select),
    },
    {
      id: "right",
      icon: Icon.ChevronRight,
      title: "Right · D",
      tint: Color.PrimaryText,
      action: (c) => sendKey(c, RemoteKey.Right),
    },
    B("b4"),
    // Row 3
    B("b5"),
    { id: "back", icon: Icon.Undo, title: "Back · B", action: (c) => sendKey(c, RemoteKey.Menu) },
    {
      id: "down",
      icon: Icon.ChevronDown,
      title: "Down · S",
      tint: Color.PrimaryText,
      action: (c) => sendKey(c, RemoteKey.Down),
    },
    { id: "home", icon: Icon.House, title: "Home · Q", action: (c) => sendKey(c, RemoteKey.Home) },
    B("b6"),
    // Row 4
    B("b7"),
    { id: "skipback", icon: Icon.Rewind, title: "−10s · ,", action: (c) => skipBy(c, -10) },
    {
      id: "playpause",
      icon: Icon.PlayFilled,
      title: "Play · ␣",
      tint: Color.Blue,
      action: (c) => sendKey(c, RemoteKey.PlayPause),
    },
    { id: "skipfwd", icon: Icon.Forward, title: "+10s · .", action: (c) => skipBy(c, 10) },
    B("b8"),
    // Row 5
    B("b9"),
    { id: "prev", icon: Icon.RewindFilled, title: "Prev · [", action: (c) => sendKey(c, RemoteKey.Previous) },
    { id: "cc", icon: Icon.Switch, title: "Control Center · C", action: controlCenter },
    { id: "next", icon: Icon.ForwardFilled, title: "Next · ]", action: (c) => sendKey(c, RemoteKey.Next) },
    B("b10"),
    // Row 6
    B("b11"),
    B("b12"),
    { id: "type", icon: Icon.Keyboard, title: "Type · T", action: "type-text" },
    B("b13"),
    B("b14"),
  ];

  return (
    <Grid
      columns={5}
      aspectRatio="4/3"
      inset={Grid.Inset.Small}
      searchBarPlaceholder="Keys: WASD move · F select · Space ⏯ · B back · Q home"
      filtering={false}
      onSearchTextChange={handleTyped}
      searchText=""
    >
      <Grid.Section title={`${deviceName} · ${statusLabel}`}>
        {cells.map((cell) => (
          <Grid.Item
            key={cell.id}
            content={
              cell.icon === "blank" ? "blank.png" : { source: cell.icon, tintColor: cell.tint ?? Color.SecondaryText }
            }
            title={cell.title}
            actions={
              cell.action ? (
                <ActionPanel>
                  <Action
                    title={cell.title || "Press"}
                    icon={cell.icon === "blank" ? Icon.Dot : cell.icon}
                    onAction={() => (cell.action === "type-text" ? pushTypeText() : run(cell.action as DeviceAction))}
                  />
                  {sharedShortcuts}
                </ActionPanel>
              ) : undefined
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}

function TypeTextForm({ connRef }: { connRef: React.MutableRefObject<AppleTVConnection | null> }) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="Type Text on Apple TV"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Text"
            icon={Icon.Text}
            onSubmit={async (values: { text: string }) => {
              const conn = connRef.current;
              if (!conn) {
                await showToast({ style: Toast.Style.Failure, title: "Not connected" });
                return;
              }
              try {
                await setText(conn, values.text);
                await showToast({ style: Toast.Style.Success, title: "Text sent" });
                pop();
              } catch {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Couldn't Send Text",
                  message: "Focus a text field on the Apple TV first (e.g. a search box).",
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Sends text into the focused field on the Apple TV. Focus a search box there first." />
      <Form.TextField id="text" title="Text" placeholder="rick and morty" autoFocus />
    </Form>
  );
}
