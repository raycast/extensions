import { Action, ActionPanel, Color, Icon, Keyboard, LaunchProps, List, Toast, showToast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { Intercom, RingApi } from "./api/ring-api";
import { RingAuthenticationError, isSignedOut } from "./errors";
import { getDefaultIntercomId, setDefaultIntercomId } from "./utils/storage";
import { ChooseReason, openAuthenticate, showRingFailure, unlockIntercom } from "./utils/intercoms";

const LOW_BATTERY = 20;

const UNLOCK_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "u" },
  Windows: { modifiers: ["ctrl"], key: "u" },
};

// One Ring session for this command. The list and its actions share its token refresh, so two requests never use
// the same refresh token at once (Ring replaces it on each use).
let session: Promise<RingApi> | undefined;

function ringSession(): Promise<RingApi> {
  session ??= RingApi.fromStorage().catch((error) => {
    session = undefined;
    throw error;
  });
  return session;
}

async function loadIntercoms(): Promise<Intercom[]> {
  try {
    return await (await ringSession()).getIntercoms();
  } catch (error) {
    // Pick up a sign-in made in Authenticate since.
    if (isSignedOut(error)) {
      session = undefined;
    }
    throw error;
  }
}

function errorMessage(error: Error): string {
  return error instanceof RingAuthenticationError ? error.userMessage : error.message;
}

// Two intercoms with the same name are told apart by their Ring device ID.
function subtitleFor(intercom: Intercom, intercoms: Intercom[]): string | undefined {
  const nameIsShared = intercoms.some((other) => other.id !== intercom.id && other.name === intercom.name);
  return nameIsShared ? `ID ${intercom.id}` : undefined;
}

const CHOOSE_MESSAGES: Record<ChooseReason, { title: string; message: string }> = {
  "no-default": { title: "Choose an Intercom", message: "Set a default, or unlock one from this list" },
  "default-missing": {
    title: "Default Intercom Not Found",
    message: "Set a new default, or unlock one from this list",
  },
};

// Raycast right-aligns accessories, so the last one always lines up. The connection dot goes last and is always
// shown, so the dots line up whatever the battery text's width.
function accessoriesFor(intercom: Intercom, isDefault: boolean): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (isDefault) {
    accessories.push({ tag: { value: "Default", color: Color.Green }, tooltip: "Unlock Door opens this intercom" });
  }

  if (intercom.battery !== undefined) {
    const low = intercom.battery <= LOW_BATTERY;
    accessories.push({
      text: { value: `${intercom.battery}%`, color: low ? Color.Red : undefined },
      tooltip: `Battery ${intercom.battery}%`,
    });
  }

  accessories.push(
    intercom.online === undefined
      ? { icon: { source: Icon.Circle, tintColor: Color.SecondaryText }, tooltip: "Connection unknown" }
      : {
          icon: { source: Icon.CircleFilled, tintColor: intercom.online ? Color.Green : Color.Red },
          tooltip: intercom.online ? "Online" : "Offline",
        },
  );

  return accessories;
}

export default function Command({ launchContext }: LaunchProps<{ launchContext: { reason?: ChooseReason } }>) {
  // Shows the list from last time at once, then Ring's current one.
  const {
    data: intercoms,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(loadIntercoms, [], {
    onError: (error) => {
      // The empty view explains a missing sign-in.
      if (!isSignedOut(error)) {
        showRingFailure(error, "Couldn't Load Intercoms");
      }
    },
  });
  const {
    data: defaultId,
    isLoading: defaultIsLoading,
    mutate: mutateDefault,
  } = useCachedPromise(getDefaultIntercomId);

  useEffect(() => {
    const reason = launchContext?.reason;
    if (reason && CHOOSE_MESSAGES[reason]) {
      showToast({ style: Toast.Style.Failure, ...CHOOSE_MESSAGES[reason] });
    }
  }, []);

  async function setDefault(intercom: Intercom) {
    try {
      await mutateDefault(setDefaultIntercomId(intercom.id), {
        optimisticUpdate: () => intercom.id,
        shouldRevalidateAfter: false,
      });
      // Stay in the list, where the Default tag has moved to this intercom.
      await showToast({ style: Toast.Style.Success, title: "Default Intercom Set", message: intercom.name });
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't Set Default Intercom" });
    }
  }

  // One unlock at a time: pressing the shortcut again while Ring answers doesn't send a second command.
  const unlocking = useRef(false);

  async function unlock(intercom: Intercom) {
    if (unlocking.current) return;
    unlocking.current = true;
    try {
      await unlockIntercom(await ringSession(), intercom);
    } catch (error) {
      await showRingFailure(error, "Failed to Unlock");
    } finally {
      unlocking.current = false;
    }
  }

  if (isSignedOut(error)) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Lock}
          title="Not Signed In to Ring"
          description={error.userMessage}
          actions={
            <ActionPanel>
              <Action icon={Icon.Key} title="Authenticate" onAction={() => openAuthenticate()} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading || defaultIsLoading} searchBarPlaceholder="Search intercoms">
      {/* Only for an empty account. When the search matches nothing, Raycast shows its own empty view. */}
      {!isLoading && !intercoms?.length && (
        <List.EmptyView
          icon={Icon.Bell}
          title={error ? "Couldn't Load Intercoms" : "No Ring Intercoms Found"}
          description={error ? errorMessage(error) : "Add your intercom in the Ring app first"}
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={revalidate} />
            </ActionPanel>
          }
        />
      )}
      {intercoms?.map((intercom) => (
        <List.Item
          key={intercom.id}
          title={intercom.name}
          subtitle={subtitleFor(intercom, intercoms)}
          accessories={accessoriesFor(intercom, intercom.id === defaultId)}
          actions={
            // Rows shown from last time may be out of date. Act only on what Ring just returned.
            isLoading ? undefined : (
              <ActionPanel>
                {!error && (
                  <Action icon={Icon.CheckCircle} title="Set as Default" onAction={() => setDefault(intercom)} />
                )}
                <Action
                  icon={Icon.ArrowClockwise}
                  title="Refresh"
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
                {/* Not in the ⌘↵ slot, so it takes a deliberate shortcut. */}
                {!error && (
                  <Action
                    icon={Icon.LockUnlocked}
                    title="Unlock Door"
                    shortcut={UNLOCK_SHORTCUT}
                    onAction={() => unlock(intercom)}
                  />
                )}
              </ActionPanel>
            )
          }
        />
      ))}
    </List>
  );
}
