import { Action, Alert, confirmAlert, Icon, Image, Keyboard } from "@raycast/api";

export const PrimaryAction = ({ title, onAction }: { title: string; onAction: () => void }) => (
  <Action title={title} icon={Icon.ArrowRight} onAction={onAction} />
);

export const PinAction = ({
  title,
  isPinned,
  onAction,
}: {
  title: string;
  isPinned: boolean;
  onAction: () => void;
  // `Icon.Tack` / `Icon.TackDisabled` — the pushpin pair Raycast's own first-party
  // Clipboard History uses for "Pin Entry", so this matches the convention a user already
  // knows from the app itself rather than inventing one.
  //
  // The two rejected alternatives, since the identifiers make both look plausible:
  // `Icon.Pin` renders as a lollipop, and `Icon.PinDisabled` — despite its name — is a
  // struck-through MAP MARKER, i.e. the disabled form of `Icon.Geopin`. Pairing those
  // produced two unrelated shapes on screen for one toggle.
  //
  // `Common.Pin` (⌘. in Raycast's own Clipboard History) so the gesture is identical on
  // every surface that pins: Recents rows, presets, and the answer view. Verified against
  // the resolved panels that nothing else claims it.
}) => (
  <Action
    title={title}
    icon={isPinned ? Icon.TackDisabled : Icon.Tack}
    onAction={onAction}
    shortcut={Keyboard.Shortcut.Common.Pin}
  />
);

export const CopyToClipboardAction = (props: Action.CopyToClipboard.Props) => (
  <Action.CopyToClipboard icon={Icon.CopyClipboard} {...props} />
);

/**
 * Pins the containing conversation in `recents_v1`.
 *
 * Was "Save Answer" with `Icon.Star`. Renamed because "Save" had become genuinely
 * ambiguous in this extension: Export History writes an actual file to disk, while this
 * only flags something for later. Those are different operations and both were called
 * "save". "Pin" is the conventional word for the second one, and it is what Claude
 * desktop calls the same gesture.
 *
 * The star was also a third metaphor for one concept — `PinAction` above pins the same
 * thing. Both use `Icon.Tack` now; see that action for why not `Icon.Pin`/`Icon.Geopin`.
 *
 * `Keyboard.Shortcut.Common.Pin` is Raycast's semantic constant for this gesture, which
 * its own Clipboard History surfaces as ⌘. — using the constant rather than hardcoding
 * `{ modifiers: ["cmd"], key: "." }` keeps this aligned if that binding ever changes. The
 * concrete value is injected by the Raycast host at runtime and is not resolvable from
 * the package, so ⌘. is confirmed from the app's own UI rather than from the types.
 */
export const PinAnswerAction = ({ onAction }: { onAction: () => void }) => (
  <Action icon={Icon.Tack} title="Pin Conversation" onAction={onAction} shortcut={Keyboard.Shortcut.Common.Pin} />
);

export const SaveAsSnippetAction = ({ text, name }: { text: string; name: string }) => (
  <Action.CreateSnippet
    icon={Icon.Snippets}
    title="Save as a Snippet"
    snippet={{ text, name }}
    shortcut={Keyboard.Shortcut.Common.New}
  />
);

export const DestructiveAction = ({
  icon = Icon.Trash,
  title,
  dialog,
  onAction,
  shortcut = Keyboard.Shortcut.Common.Remove,
}: {
  icon?: Image.ImageLike;
  title: string;
  dialog: { title?: string; message?: string; primaryButton?: string };
  onAction: () => void;
  shortcut?: Keyboard.Shortcut;
}) => (
  <Action
    style={Action.Style.Destructive}
    icon={icon}
    title={title}
    onAction={async () => {
      await confirmAlert({
        title: dialog.title ?? title,
        message: dialog.message ?? "This action cannot be undone",
        icon,
        primaryAction: {
          title: dialog.primaryButton ?? title,
          style: Alert.ActionStyle.Destructive,
          onAction,
        },
      });
    }}
    shortcut={shortcut}
  />
);
