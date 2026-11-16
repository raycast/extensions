// Full editor for a contact. Opened from the results view, after a failed save,
// or directly when there is nothing to read yet.
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Keyboard,
  Toast,
  showToast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  PHONE_LABELS,
  copyState,
  exportState,
  saveState,
  stateFromDraft,
  toNative,
  type FormState,
} from "../core/contact";
import { LOG_FILE, log } from "../core/log";
import type { ContactDraft, Labeled } from "../core/parse";
import { readContact, readImage } from "../core/read";
import { useContactsInfo } from "../core/useContactsInfo";

type Props = {
  initial: FormState;
  text: string;
  /** Shown once on open: why the previous save failed, or why reading failed. */
  error?: { title: string; message: string };
};

export function ContactForm(props: Props) {
  const [text, setText] = useState(props.text);
  const [draft, setDraft] = useState<ContactDraft>(props.initial.draft);
  const [emails, setEmails] = useState(props.initial.emails);
  const [urls, setUrls] = useState(props.initial.urls);
  const [note, setNote] = useState(props.initial.note);
  const [photo, setPhoto] = useState<string[]>([]);
  const [reading, setReading] = useState(false);
  const contacts = useContactsInfo(props.initial.accountId);
  const started = useRef(false);

  const state = (): FormState => ({
    draft,
    emails,
    urls,
    note,
    accountId: contacts.accountId,
  });

  const recheckExisting = () => {
    const n = toNative(state());
    void contacts.check(
      n.emails.map((e) => e.value),
      n.phones.map((p) => p.value),
    );
  };

  useEffect(() => {
    // React runs effects twice in development; the Contacts check must run once.
    if (started.current) return;
    started.current = true;
    if (props.error)
      void showToast({ style: Toast.Style.Failure, ...props.error });
    void contacts.loadCached();
    recheckExisting();
  }, []);

  async function read(input: string) {
    setReading(true);
    try {
      const d = await readContact(input);
      const next = stateFromDraft(d);
      setDraft(d);
      setEmails(next.emails);
      setUrls(next.urls);
      void contacts.check(
        d.emails.map((e) => e.value),
        d.phones.map((p) => p.value),
      );
    } catch (err) {
      log("form", "could not read text", err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not read the text",
        message: String(err),
      });
    } finally {
      setReading(false);
    }
  }

  async function readPhoto(files: string[]) {
    setPhoto(files);
    if (!files[0]) return;
    setReading(true);
    try {
      const recognized = await readImage(files[0]);
      if (!recognized.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No text found in the photo",
        });
        return;
      }
      setText(recognized);
      await read(recognized);
    } catch (err) {
      log("form", "could not read photo", err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not read the photo",
        message: String(err),
      });
    } finally {
      setReading(false);
    }
  }

  const set =
    <K extends keyof ContactDraft>(key: K) =>
    (value: ContactDraft[K]) =>
      setDraft((d) => ({ ...d, [key]: value }));
  const setAddr =
    (key: "street" | "postalCode" | "city" | "country") => (value: string) =>
      setDraft((d) => ({
        ...d,
        address: {
          street: "",
          postalCode: "",
          city: "",
          country: "",
          ...d.address,
          [key]: value,
        },
      }));
  const setPhone = (i: number, patch: Partial<Labeled>) =>
    setDraft((d) => ({
      ...d,
      phones: d.phones.map((p, j) => (j === i ? { ...p, ...patch } : p)),
    }));
  const addPhone = () =>
    setDraft((d) => ({
      ...d,
      phones: [...d.phones, { value: "", label: "mobile" }],
    }));

  const a = draft.address ?? {
    street: "",
    postalCode: "",
    city: "",
    country: "",
  };

  return (
    <Form
      isLoading={reading || contacts.checking}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm
              title="Save to Contacts"
              icon={Icon.AddPerson}
              onSubmit={() => saveState(state(), {}, text)}
            />
            <Action.SubmitForm
              title="Save and Open in Contacts"
              icon={Icon.AppWindow}
              shortcut={Keyboard.Shortcut.Common.Open}
              onSubmit={() => saveState(state(), { openAfter: true }, text)}
            />
            {contacts.existing.map((e, i) => (
              <Action.SubmitForm
                key={e.id}
                title={`Add to Existing Contact: ${e.name}`}
                icon={Icon.PersonCircle}
                shortcut={
                  i === 0
                    ? { modifiers: ["cmd", "shift"], key: "return" }
                    : undefined
                }
                onSubmit={() => saveState(state(), { updateId: e.id }, text)}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Export Contact File"
              icon={Icon.Download}
              shortcut={Keyboard.Shortcut.Common.Save}
              onAction={() => exportState(state())}
            />
            <Action
              title="Copy Contact Card"
              icon={Icon.Clipboard}
              shortcut={Keyboard.Shortcut.Common.Copy}
              onAction={() => copyState(state())}
            />
            <Action
              title="Add Phone Number"
              icon={Icon.Phone}
              shortcut={Keyboard.Shortcut.Common.New}
              onAction={addPhone}
            />
            <Action
              title="Read Text Again"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={() => read(text)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {contacts.existing.map((e) => (
              <Action.Open
                key={e.id}
                title={`Open ${e.name} in Contacts`}
                icon={Icon.Person}
                target={`addressbook://${e.id}`}
              />
            ))}
            <Action.Open
              title="Open Debug Log"
              icon={Icon.Bug}
              target={LOG_FILE}
              application="Console"
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {contacts.existing.length > 0 && (
        <Form.Description
          title="Already in Contacts"
          text={`${contacts.existing.map((e) => e.name).join(", ")}. ⌘⇧↵ adds the new details to the existing card instead.`}
        />
      )}
      <Form.TextField
        id="namePrefix"
        title="Academic Title"
        placeholder="Mag., Dr., DI"
        value={draft.namePrefix}
        onChange={set("namePrefix")}
      />
      <Form.TextField
        id="givenName"
        title="First Name"
        placeholder="Anna"
        value={draft.givenName}
        onChange={set("givenName")}
      />
      <Form.TextField
        id="familyName"
        title="Last Name"
        placeholder="Huber"
        value={draft.familyName}
        onChange={set("familyName")}
      />
      <Form.TextField
        id="nameSuffix"
        title="Suffix"
        placeholder="MBA, MSc"
        value={draft.nameSuffix}
        onChange={set("nameSuffix")}
      />
      <Form.TextField
        id="jobTitle"
        title="Job Title"
        placeholder="Managing Director"
        value={draft.jobTitle}
        onChange={set("jobTitle")}
      />
      <Form.TextField
        id="organization"
        title="Company"
        placeholder="Huber GmbH"
        value={draft.organization}
        onChange={set("organization")}
      />
      <Form.Separator />
      <Form.TextField
        id="emails"
        title="Email"
        placeholder="anna@huber.at"
        info="Separate several with commas"
        value={emails}
        onChange={setEmails}
        onBlur={recheckExisting}
      />
      {draft.phones.map((p, i) => (
        <PhoneRow
          key={i}
          index={i}
          phone={p}
          onChange={(patch) => setPhone(i, patch)}
          onBlur={recheckExisting}
        />
      ))}
      {draft.phones.length === 0 && (
        <Form.Description title="Phone" text="None found. ⌘N adds one." />
      )}
      <Form.TextField
        id="urls"
        title="Website"
        placeholder="huber.at"
        info="Separate several with commas"
        value={urls}
        onChange={setUrls}
      />
      <Form.Separator />
      <Form.TextField
        id="street"
        title="Street"
        placeholder="Mariahilfer Straße 1"
        value={a.street}
        onChange={setAddr("street")}
      />
      <Form.TextField
        id="postalCode"
        title="Postal Code"
        placeholder="1060"
        value={a.postalCode}
        onChange={setAddr("postalCode")}
      />
      <Form.TextField
        id="city"
        title="City"
        placeholder="Vienna"
        value={a.city}
        onChange={setAddr("city")}
      />
      <Form.TextField
        id="country"
        title="Country"
        placeholder="Austria"
        value={a.country}
        onChange={setAddr("country")}
      />
      <Form.Separator />
      {contacts.accounts.length > 1 && (
        <Form.Dropdown
          id="account"
          title="Save To"
          value={contacts.accountId}
          onChange={contacts.setAccountId}
        >
          {contacts.accounts.map((acc) => (
            <Form.Dropdown.Item
              key={acc.id}
              value={acc.id}
              title={acc.isDefault ? `${acc.name} (Default)` : acc.name}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField
        id="note"
        title="Note"
        placeholder="Where you met, context"
        value={note}
        onChange={setNote}
      />
      <Form.Separator />
      <Form.FilePicker
        id="photo"
        title="Card Photo"
        info="A photo or scan of a business card. Its text is read on your Mac and fills the fields above."
        allowMultipleSelection={false}
        canChooseDirectories={false}
        value={photo}
        onChange={readPhoto}
      />
      <Form.TextArea
        id="text"
        title="Captured Text"
        placeholder="Paste a signature, card text or profile here"
        info="Edit or paste here, then ⌘R to read it again"
        value={text}
        onChange={setText}
      />
    </Form>
  );
}

function PhoneRow(props: {
  index: number;
  phone: Labeled;
  onChange: (patch: Partial<Labeled>) => void;
  onBlur: () => void;
}) {
  const { index, phone, onChange, onBlur } = props;
  return (
    <>
      <Form.TextField
        id={`phone-${index}`}
        title={index === 0 ? "Phone" : ""}
        placeholder="+43 664 123 4567"
        value={phone.value}
        onChange={(value) => onChange({ value })}
        onBlur={onBlur}
      />
      <Form.Dropdown
        id={`phone-label-${index}`}
        title=""
        value={phone.label}
        onChange={(label) => onChange({ label })}
      >
        {PHONE_LABELS.map((l) => (
          <Form.Dropdown.Item key={l.value} value={l.value} title={l.title} />
        ))}
      </Form.Dropdown>
    </>
  );
}
