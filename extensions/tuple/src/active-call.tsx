import { Clipboard, Color, Icon, MenuBarExtra, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
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
import { CallView, CallViewParticipant, Contact, TupleErrorKind } from "./lib/types";

export default function ActiveCallMenuBar() {
  // The roster comes from `tuple call current` (normalized, self already excluded); online
  // contacts for "Add Person" come from `tuple contacts list --status online`, fetched only while
  // in a call. Neither reads the full `tuple state` blob. `call current` exits non-zero when not
  // in a call, which classifyError maps to NoActiveCall — a normal state, not a failure.
  const call = useTupleJson<CallView>(["call", "current"]);
  const callError = call.error ? classifyError(call.error) : undefined;
  const noActiveCall = callError?.kind === TupleErrorKind.NoActiveCall;
  const realError = callError && !noActiveCall ? callError : undefined;
  const activeCall = callError ? undefined : call.data;

  const contacts = useTupleJson<Contact[]>(["contacts", "list", "--status", "online"], {
    execute: Boolean(activeCall),
  });

  if (realError) {
    return (
      <MenuBarExtra isLoading={call.isLoading} icon={{ source: Icon.Warning, tintColor: Color.Red }} tooltip="Tuple">
        <MenuBarExtra.Item title={realError.message} />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={call.revalidate} />
      </MenuBarExtra>
    );
  }

  if (!activeCall) {
    return (
      <MenuBarExtra isLoading={call.isLoading} icon={Icon.VideoDisabled} tooltip="Tuple — no active call">
        <MenuBarExtra.Item title="No Active Call" />
      </MenuBarExtra>
    );
  }

  const others = activeCall.participants;
  const onlineContacts = contacts.data ?? [];

  return (
    <MenuBarExtra
      isLoading={call.isLoading}
      icon={{ source: Icon.Video, tintColor: Color.Green }}
      title={memberSummary(others)}
      tooltip="Tuple — in a call"
    >
      {others.length > 0 && (
        <MenuBarExtra.Section title="In a Call">
          {others.map((person) => (
            <MenuBarExtra.Item key={person.id || person.email} title={personName(person)} icon={Icon.Person} />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={activeCall.muted ? "Unmute" : "Mute"}
          icon={activeCall.muted ? Icon.MicrophoneDisabled : Icon.Microphone}
          onAction={() => runAction(activeCall.muted ? unmuteCall : muteCall, call.revalidate)}
        />
        <MenuBarExtra.Item
          title={activeCall.transcribing ? "Stop Transcription" : "Start Transcription"}
          icon={activeCall.transcribing ? Icon.Stop : Icon.SpeechBubble}
          onAction={() => runAction(activeCall.transcribing ? stopTranscription : startTranscription, call.revalidate)}
        />
        <AddPersonSubmenu contacts={onlineContacts} onChange={call.revalidate} />
        <MenuBarExtra.Item title="Copy AI Context" icon={Icon.Clipboard} onAction={copyCallContext} />
        <MenuBarExtra.Item
          title="Hang Up"
          icon={Icon.PhoneRinging}
          onAction={() => runAction(hangUpCall, call.revalidate)}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

/** Online contacts the user can add to the current call. */
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

function personName(person: CallViewParticipant): string {
  return person.name || person.email || "Participant";
}

function memberSummary(people: CallViewParticipant[]): string | undefined {
  if (people.length === 0) {
    return undefined;
  }
  const [first] = people;
  const name = first.name || first.email || "In call";
  return people.length === 1 ? name : `${name} +${people.length - 1}`;
}
