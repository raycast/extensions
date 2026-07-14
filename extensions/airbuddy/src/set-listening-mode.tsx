import { Action, ActionPanel, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { type OutputDevice, getOutputDevice, setListeningMode } from "./airbuddy";
import { ErrorView } from "./components/error-views";
import { showFailure } from "./feedback";
import { pollUntil } from "./poll";
import { LISTENING_MODE_LABELS, type ListeningMode, listeningModeIcon } from "./types";

/**
 * A VIEW command, not the manifest-declared dropdown argument it started as.
 *
 * Two things a static manifest dropdown genuinely cannot do — verified against Raycast's own
 * extension.json schema, `arguments[].data[]` only accepts `{ title, value }`, no `icon` — and
 * neither can it know, at build time, which mode is currently active:
 *   1. Show an icon per mode.
 *   2. Pre-select / mark the mode the headset is already on.
 *   3. List only the modes THIS headset actually supports — the old static dropdown always offered
 *      all four regardless of hardware, which needed a "doesn't support that mode" guard after the
 *      fact. A Form built from live data doesn't need the guard; the option is never there.
 *
 * `Form.Dropdown.Item` supports `icon` (verified in the installed @raycast/api types), which is what
 * unlocks all three.
 *
 * Loading and empty states render a `List` + `List.EmptyView`, NOT a `Form.Description` inside an
 * otherwise-empty Form. `Form.Description` is a left-aligned label/text row meant for inline help
 * text *within* a filled-out form — used for "there's nothing to fill in" it renders as a mostly
 * blank form with one stray line, which reads as broken rather than intentional. `List.EmptyView`
 * (icon, centered title, description, actions) is the empty-state component this extension already
 * uses everywhere else (list-devices.tsx, error-views.tsx) — matching it here keeps one visual
 * language instead of two.
 */
export default function Command() {
  const { pop } = useNavigation();
  const [output, setOutput] = useState<OutputDevice | null | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);

  function load() {
    setError(undefined);
    getOutputDevice().then(setOutput, (err: unknown) => {
      // Collapsing every rejection into "no headset" was wrong: AirBuddy not running, scripting
      // disabled, and Automation consent denied all reject too, and each needs its own recovery
      // guidance (see ErrorView) — not the generic "connect a headset" message.
      setOutput(null);
      setError(err instanceof Error ? err : new Error(String(err)));
    });
  }

  useEffect(load, []);

  async function handleSubmit(values: { mode: string }) {
    const mode = values.mode as ListeningMode;

    if (!output) return; // No target to submit against — the Form only renders when output exists.

    // Already on it? Say so rather than dispatching a no-op and claiming we "set" it.
    if (output.listeningMode === mode) {
      await showToast({ style: Toast.Style.Success, title: `Already ${LISTENING_MODE_LABELS[mode]}` });
      pop();
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: `Setting ${LISTENING_MODE_LABELS[mode]}…` });

    try {
      await setListeningMode(mode, output.id);

      await pollUntil(
        () => getOutputDevice(),
        (d) => d?.listeningMode === mode,
        {
          description: `${output.name} never switched to ${LISTENING_MODE_LABELS[mode]}`,
        },
      );

      toast.style = Toast.Style.Success;
      toast.title = LISTENING_MODE_LABELS[mode];
      pop();
    } catch (error) {
      await showFailure("Couldn't set the listening mode", error);
    }
  }

  const isLoading = output === undefined;
  const hasHeadset = output != null && output.supportedListeningModes.length > 0;

  if (error) {
    return (
      <List>
        <ErrorView error={error} onRetry={load} />
      </List>
    );
  }

  if (isLoading || !hasHeadset) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.Bluetooth}
          title={isLoading ? "Looking for a Headset…" : "No Headset Connected"}
          description={isLoading ? undefined : "Connect a headset that supports listening modes, then try again."}
        />
      </List>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Listening Mode" icon={Icon.Checkmark} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="mode" title="Listening Mode" defaultValue={output.listeningMode}>
        {output.supportedListeningModes.map((mode) => {
          const isCurrent = mode === output.listeningMode;
          return (
            <Form.Dropdown.Item
              key={mode}
              value={mode}
              // Form.Dropdown.Item has the same shape as the ActionPanel Action: `title` is a plain
              // string with no separate marker slot, and the collapsed field / row highlight alone
              // don't read as "this is the current mode" versus "this is what's focused" —
              // especially before the user has interacted with the list. Same trailing-✓ fix as the
              // submenu, for the same reason.
              title={isCurrent ? `${LISTENING_MODE_LABELS[mode]} ✓` : LISTENING_MODE_LABELS[mode]}
              icon={listeningModeIcon(mode)}
            />
          );
        })}
      </Form.Dropdown>
    </Form>
  );
}
