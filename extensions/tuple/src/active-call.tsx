import { Clipboard, Color, Icon, MenuBarExtra, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { CallPerson, callParticipants, isActiveCall, isCallMuted, isTranscribing, personName } from "./lib/call";
import { useTupleJson } from "./lib/hooks";
import {
  addToCall,
  classifyError,
  getConnectPrompt,
  hangUpCall,
  muteCall,
  startTranscription,
  stopTranscription,
  unmuteCall,
} from "./lib/tuple";
import { Contact, TupleState } from "./lib/types";

export default function ActiveCallMenuBar() {
  // `state` carries the current call, the current user (to drop self from the roster), and contacts
  // (so Add Person needs no extra exec) in one call. No failureTitle: the menu bar renders its own states.
  const { data, isLoading, error, revalidate } = useTupleJson<TupleState>(["state"]);
  const classified = error ? classifyError(error) : undefined;

  if (classified) {
    return (
      <MenuBarExtra isLoading={isLoading} icon={{ source: Icon.Warning, tintColor: Color.Red }} tooltip="Tuple">
        <MenuBarExtra.Item title={classified.message} />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
      </MenuBarExtra>
    );
  }

  const call = data?.current_call;

  if (!isActiveCall(call)) {
    return (
      <MenuBarExtra isLoading={isLoading} icon={Icon.VideoDisabled} tooltip="Tuple — no active call">
        <MenuBarExtra.Item title="No Active Call" />
      </MenuBarExtra>
    );
  }

  const others = callParticipants(call, data?.current_user?.id);
  const muted = isCallMuted(call);
  const transcribing = isTranscribing(call);
  const onlineContacts = (data?.contacts ?? []).filter((contact) => contact.status === "online");

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: Icon.Video, tintColor: Color.Green }}
      title={memberSummary(others)}
      tooltip="Tuple — in a call"
    >
      {others.length > 0 && (
        <MenuBarExtra.Section title="In a Call">
          {others.map((person) => (
            <MenuBarExtra.Item key={person.id ?? person.email} title={personName(person)} icon={Icon.Person} />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={muted ? "Unmute" : "Mute"}
          icon={muted ? Icon.MicrophoneDisabled : Icon.Microphone}
          onAction={() => runAction(muted ? unmuteCall : muteCall, revalidate)}
        />
        <MenuBarExtra.Item
          title={transcribing ? "Stop Transcription" : "Start Transcription"}
          icon={transcribing ? Icon.Stop : Icon.SpeechBubble}
          onAction={() => runAction(transcribing ? stopTranscription : startTranscription, revalidate)}
        />
        <AddPersonSubmenu contacts={onlineContacts} onChange={revalidate} />
        <MenuBarExtra.Item title="Copy AI Context" icon={Icon.Clipboard} onAction={copyCallContext} />
        <MenuBarExtra.Item
          title="Hang Up"
          icon={Icon.PhoneRinging}
          onAction={() => runAction(hangUpCall, revalidate)}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

/** Online contacts the user can add to the current call (sourced from the same state payload). */
function AddPersonSubmenu({ contacts, onChange }: { contacts: Contact[]; onChange: () => void }) {
  if (contacts.length === 0) {
    return null;
  }

  return (
    <MenuBarExtra.Submenu title="Add Person" icon={Icon.AddPerson}>
      {contacts.map((contact) => (
        <MenuBarExtra.Item
          key={contact.id}
          title={contact.full_name}
          icon={Icon.Person}
          onAction={() => runAction(() => addToCall(contact.email), onChange)}
        />
      ))}
    </MenuBarExtra.Submenu>
  );
}

/** Copy an AI prompt describing the active call. Reached only from the in-call menu, so no idle guard. */
async function copyCallContext() {
  try {
    const prompt = await getConnectPrompt();
    await Clipboard.copy(prompt);
    await showHUD("Copied call context for AI");
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Copy Call Context" });
  }
}

async function runAction(action: () => Promise<void>, onChange: () => void) {
  try {
    await action();
    onChange();
  } catch (error) {
    await showFailureToast(error, { title: "Tuple Action Failed" });
  }
}

function memberSummary(people: CallPerson[]): string | undefined {
  if (people.length === 0) {
    return undefined;
  }
  const [first] = people;
  const name = first.short_name ?? first.full_name ?? first.email ?? "In call";
  return people.length === 1 ? name : `${name} +${people.length - 1}`;
}
