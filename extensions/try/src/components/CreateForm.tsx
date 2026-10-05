import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { setTimeout as delay } from "timers/promises";
import { basename } from "path";
import { createTryDirectory, generateDatePrefix } from "../lib/utils";

// How long the "Created" confirmation stays up before we dismiss it ourselves.
// Long enough to read the directory name, short enough that it can't follow the
// user around the desktop after they leave Raycast.
const SUCCESS_TOAST_DURATION_MS = 2000;

interface CreateFormProps {
  onSuccess: () => void;
}

export function CreateForm({ onSuccess }: CreateFormProps) {
  const [name, setName] = useState("");
  const { pop } = useNavigation();

  const handleSubmit = async () => {
    if (!name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name required",
      });
      return;
    }

    let createdPath: string;
    try {
      createdPath = createTryDirectory(name);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create directory",
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    // Keep the handle so we can dismiss this ourselves. Without it the toast is
    // fire-and-forget: `pop()` unmounts the form while the toast is still owned by the
    // command, and once the Raycast window goes away the toast detaches into a floating
    // overlay that outlives the command that created it.
    const toast = await showToast({
      style: Toast.Style.Success,
      title: "Created",
      message: basename(createdPath),
    });

    onSuccess();
    pop();

    // Best-effort dismissal. The directory already exists by this point, so a failure to
    // hide must never surface as an error — the toast expires on its own regardless.
    await delay(SUCCESS_TOAST_DURATION_MS);
    await toast.hide().catch(() => undefined);
  };

  return (
    <Form
      navigationTitle="Create Try Directory"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="my-experiment"
        info={`Will create: ${generateDatePrefix()}-${name || "..."} (auto-numbered if exists)`}
        value={name}
        onChange={setName}
        autoFocus
      />
    </Form>
  );
}
