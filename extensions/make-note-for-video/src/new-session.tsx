import { Action, ActionPanel, Form, Icon, open, PopToRootType, showHUD } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { strings } from "./lib/strings";
import { preferences, sessionAt, setActiveSession } from "./lib/session";

const today = () => new Date().toLocaleDateString("sv-SE");

// Colons and slashes in a folder name break Finder and paths.
const safeName = (title: string) => title.trim().replace(/[/:]/g, "-");

export default function Command() {
  const { handleSubmit, itemProps } = useForm<{ title: string }>({
    validation: { title: (value) => (value?.trim() ? undefined : strings.enterTitle) },
    async onSubmit({ title }) {
      const { notesDir, editor } = preferences();
      const session = sessionAt(join(notesDir, `${today()} ${safeName(title)}`));
      mkdirSync(session.shotsDir, { recursive: true });
      if (!existsSync(session.notesPath)) writeFileSync(session.notesPath, `# ${title.trim()}\n\n`);
      await setActiveSession(session.dir);
      await open(session.notesPath, editor);
      await showHUD(strings.activeSession(session.name), { popToRootType: PopToRootType.Immediate });
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={strings.create} icon={Icon.NewFolder} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title={strings.sessionTitle}
        placeholder={strings.sessionPlaceholder}
        autoFocus
        {...itemProps.title}
      />
    </Form>
  );
}
