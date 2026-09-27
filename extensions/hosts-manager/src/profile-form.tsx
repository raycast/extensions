import {
  Action,
  ActionPanel,
  Form,
  Keyboard,
  useNavigation,
} from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useState } from "react";
import { commitStore } from "./lib/apply";
import { isReservedProfileName } from "./lib/managed-block";
import { strings } from "./lib/strings";
import type { HostsProfile, HostsStore } from "./lib/storage";

interface BaseProps {
  store: HostsStore;
  onDone: () => Promise<void> | void;
}

interface ExistingProfileProps extends BaseProps {
  profile: HostsProfile;
}

/** Object literal types (not interfaces) so they satisfy `Form.Values`. */
type NewProfileValues = { name: string; content: string };
type ContentValues = { content: string };

/**
 * A name has to survive the round trip through its section header, so empty,
 * multi-line and reserved names are rejected before anything is written.
 */
function validateProfileName(raw: string): string | undefined {
  const name = raw.trim();
  if (name === "") return strings.nameRequired;
  if (/[\r\n]/.test(name)) return strings.nameInvalid;
  if (isReservedProfileName(name)) return strings.nameReserved;
  return undefined;
}

/**
 * Persists `next`, creating it when the id is unknown. /etc/hosts is
 * rewritten when the profile is the applied one, or when `apply` asks for it.
 */
async function saveProfile(
  store: HostsStore,
  next: HostsProfile,
  options: {
    successTitle: string;
    apply?: boolean;
  },
): Promise<boolean> {
  const exists = store.profiles.some((item) => item.id === next.id);
  const apply = options.apply ?? false;
  return commitStore({
    previous: store,
    next: {
      ...store,
      profiles: exists
        ? store.profiles.map((item) => (item.id === next.id ? next : item))
        : [...store.profiles, next],
      activeProfileId: apply ? next.id : store.activeProfileId,
    },
    sync: apply || next.id === store.activeProfileId,
    successTitle: options.successTitle,
  });
}

export function NewProfileForm({ store, onDone }: BaseProps) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const s = strings;

  async function handleSubmit(values: NewProfileValues, apply: boolean) {
    const nameError = validateProfileName(values.name);
    if (nameError) {
      setNameError(nameError);
      return;
    }
    const name = values.name.trim();

    const saved = await saveProfile(
      store,
      { id: randomUUID(), name, content: values.content },
      {
        apply,
        successTitle: apply ? s.profileCreatedAndApplied : s.profileCreated,
      },
    );
    if (saved) {
      await onDone();
      pop();
    }
  }

  return (
    <Form
      navigationTitle={s.newProfile}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={s.createProfile}
            onSubmit={(values: NewProfileValues) => handleSubmit(values, false)}
          />
          <Action.SubmitForm
            title={s.createAndApply}
            shortcut={Keyboard.Shortcut.Common.Save}
            onSubmit={(values: NewProfileValues) => handleSubmit(values, true)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title={s.nameField}
        placeholder={s.namePlaceholder}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextArea
        id="content"
        title={s.contentField}
        placeholder={"127.0.0.1 localhost"}
      />
    </Form>
  );
}

export function ProfileContentForm({
  store,
  profile,
  onDone,
}: ExistingProfileProps) {
  const { pop } = useNavigation();
  const isApplied = profile.id === store.activeProfileId;
  const s = strings;

  async function handleSubmit(values: ContentValues, apply: boolean) {
    const saved = await saveProfile(
      store,
      { ...profile, content: values.content },
      {
        apply,
        successTitle: apply ? s.profileSavedAndApplied : s.profileSaved,
      },
    );
    if (saved) {
      await onDone();
      pop();
    }
  }

  return (
    <Form
      navigationTitle={s.editProfileTitle(profile.name)}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={s.save}
            onSubmit={(values: ContentValues) => handleSubmit(values, false)}
          />
          {!isApplied && (
            <Action.SubmitForm
              title={s.saveAndApply}
              shortcut={Keyboard.Shortcut.Common.Save}
              onSubmit={(values: ContentValues) => handleSubmit(values, true)}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title={s.contentField}
        placeholder={"127.0.0.1 localhost"}
        defaultValue={profile.content}
      />
    </Form>
  );
}

export function RenameProfileForm({
  store,
  profile,
  onDone,
}: ExistingProfileProps) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const s = strings;

  async function handleSubmit(values: { name: string }) {
    const nameError = validateProfileName(values.name);
    if (nameError) {
      setNameError(nameError);
      return;
    }
    const name = values.name.trim();

    const saved = await saveProfile(
      store,
      { ...profile, name },
      { successTitle: s.profileRenamed },
    );
    if (saved) {
      await onDone();
      pop();
    }
  }

  return (
    <Form
      navigationTitle={s.renameProfileTitle(profile.name)}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={s.rename} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title={s.nameField}
        placeholder={s.namePlaceholder}
        defaultValue={profile.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
    </Form>
  );
}
