import { Action, ActionPanel, Clipboard, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { useConnectionRecovery } from "../hooks/useConnectionRecovery";
import { describeConnectionError } from "../utils/connection";
import { shouldGuard } from "../utils/guard";
import { useTranslation } from "../hooks/useTranslation";

interface ConnectionErrorViewProps {
  error: unknown;
  onRetry: () => void;
}

/**
 * The whole guarded-view branch in one call:
 *
 *   const guard = connectionGuard(error, hasLiveData, revalidate);
 *   if (guard) return guard;
 *
 * Returns null when the view should render normally. Replaces the same
 * seven-line `if (shouldGuard(…)) return <List><ConnectionErrorView …/></List>`
 * block that appeared in a dozen places — and, more usefully, gives one obvious
 * thing to copy when a NEW view is added, since forgetting the guard is what
 * makes a connection failure silent (see the onError note in AGENTS.md).
 */
export function connectionGuard(error: unknown, hasLiveData: boolean, onRetry: () => void) {
  if (!shouldGuard(error, hasLiveData)) return null;
  // Deliberately renders a BARE List: no searchBarAccessory. The caller's
  // filter dropdown is populated from the persisted cache, so against a dead
  // server it lists stale entries that cannot be selected — offering a filter
  // over an error screen that has nothing to filter.
  return (
    <List>
      <ConnectionErrorView error={error} onRetry={onRetry} />
    </List>
  );
}

/**
 * Shown in place of a list when the API is unreachable.
 *
 * The point is recovery, not an apology: when the instance is a local container
 * we can start it and wait for it to answer, so the primary action does that
 * rather than telling the user to go do it themselves.
 */
export function ConnectionErrorView({ error, onRetry }: ConnectionErrorViewProps) {
  const { t } = useTranslation();
  const { apiUrl, container, dockerRunning, isProbing, isRecovering, recover } = useConnectionRecovery(onRetry);

  // Copied to the clipboard verbatim — carries the technical detail the
  // on-screen description deliberately leaves out.
  const detail = describeConnectionError(error, apiUrl);
  // Must match what ensureReachable will actually DO: it only starts a
  // container that is stopped (`!container.running`). Gating on mere existence
  // offers "Press ↵ to start it" for a container that is already up — the API
  // is dead for some other reason, the start is skipped, and the action
  // silently does nothing.
  const canStart = Boolean(container && !container.running) && dockerRunning;

  const title = isRecovering
    ? t("connection.starting")
    : isProbing
      ? t("connection.checking")
      : canStart
        ? t("connection.notRunning")
        : t("connection.unreachable");

  // EmptyView collapses blank lines and truncates after ~3 lines, so this has
  // to be one short sentence — a two-paragraph description renders as a
  // dangling "..." that reads like a rendering bug.
  const description = isRecovering
    ? t("connection.startingDescription")
    : isProbing
      ? t("connection.checkingDescription")
      : canStart
        ? // The title already says it isn't running; repeating the sentence
          // here just renders the same words twice.
          t("connection.notRunningDescription")
        : t("connection.unreachableDescription", { apiUrl });

  // NOT WifiDisabled for the stopped-container case: the network is fine and
  // the fix is to start a service, so a wifi glyph sends the user off to check
  // their router. It stays for the genuinely-unreachable case, which IS a
  // connectivity problem — a remote host with nothing local to start.
  //
  // NOT Stop either: at empty-state size a stop glyph reads as a button you
  // press to stop something, which is the opposite of the offered action.
  const icon = isRecovering || isProbing ? Icon.Clock : canStart ? Icon.QuestionMarkCircle : Icon.WifiDisabled;

  return (
    <List.EmptyView
      icon={icon}
      title={title}
      description={description}
      actions={
        <ActionPanel>
          {canStart && !isRecovering && (
            <Action
              // "Start Karakeep", not "Start karakeep-app" — the Compose
              // project name is a Docker implementation detail, and the user
              // is starting the app they know by name.
              title={t("connection.start")}
              icon={Icon.Play}
              onAction={recover}
            />
          )}
          <Action
            title={t("connection.tryAgain")}
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRetry}
          />
          {container && (
            <Action.Open
              title={t("connection.openDocker")}
              icon={Icon.Box}
              target="raycast://extensions/priithaamer/docker/projects_list"
              // Declared per-platform: this extension ships for Windows too, and
              // a single-form cmd-only shortcut is ambiguous there.
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "d" },
                Windows: { modifiers: ["ctrl"], key: "d" },
              }}
            />
          )}
          <Action
            title={t("connection.openSettings")}
            icon={Icon.Gear}
            // No Common constant covers "open preferences"; OpenWith means
            // "open in another app". Raycast's own binding is cmd+shift+comma,
            // declared per-platform to avoid the ambiguous-shortcut rule.
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "," },
              Windows: { modifiers: ["ctrl", "shift"], key: "," },
            }}
            onAction={openExtensionPreferences}
          />
          <Action
            title={t("connection.copyError")}
            icon={Icon.Clipboard}
            shortcut={Keyboard.Shortcut.Common.Copy}
            onAction={() => Clipboard.copy(detail)}
          />
        </ActionPanel>
      }
    />
  );
}
