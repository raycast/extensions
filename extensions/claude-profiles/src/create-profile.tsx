import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showInFinder,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { basename } from "path";
import { useRef, useState } from "react";
import { RegistryError, launchClaudeProfile, registry } from "./lib/profiles";

interface FormValues {
  name: string;
  launchNow: boolean;
  fresh: boolean;
}

interface Props {
  onCreated?: () => void;
}

export default function CreateProfile({ onCreated }: Props) {
  const [nameError, setNameError] = useState<string | undefined>();
  const [orphan, setOrphan] = useState<string | null>(null);
  const latestName = useRef("");
  const { pop } = useNavigation();

  async function handleNameChange(value: string) {
    setNameError(undefined);
    latestName.current = value;
    const found = await registry.orphanFor(value);
    // lookups resolve out of order while typing; only the latest counts
    if (latestName.current === value) setOrphan(found);
  }

  async function handleSubmit(values: FormValues) {
    const name = values.name.trim();
    if (!name) {
      setNameError("Required");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating profile…",
    });
    try {
      const profile =
        orphan && !values.fresh
          ? await registry.restore(orphan, name)
          : await registry.add(name);
      toast.style = Toast.Style.Success;
      toast.title =
        orphan && !values.fresh
          ? `Restored "${profile.name}"`
          : `Created "${profile.name}"`;

      if (values.launchNow) {
        await launchClaudeProfile(profile.dataDir);
      }

      onCreated?.();
      pop();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, {
        title: "Couldn't create profile",
        primaryAction:
          error instanceof RegistryError
            ? {
                title: "Show in Finder",
                onAction: () => showInFinder(error.path),
              }
            : undefined,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Profile" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Profile Name"
        placeholder="Work, Personal, Client A…"
        error={nameError}
        onChange={handleNameChange}
        autoFocus
      />
      <Form.Description text="Creates an isolated login for Claude Desktop. Sign in fresh the first time you open it." />
      {orphan && (
        <>
          <Form.Description
            text={`A removed profile "${basename(orphan)}" still has its login and chats at ${orphan}. Submitting restores it.`}
          />
          <Form.Checkbox
            id="fresh"
            label="Create a fresh profile instead of restoring"
            defaultValue={false}
          />
        </>
      )}
      <Form.Checkbox
        id="launchNow"
        label="Open Claude with this profile now"
        defaultValue={true}
      />
    </Form>
  );
}
