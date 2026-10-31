import { Action, ActionPanel, Icon, List, PopToRootType, showHUD } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { strings } from "./lib/strings";
import { activeSessionDir, preferences, Session, sessionAt, setActiveSession } from "./lib/session";

// A review is any folder with notes.md; most recently edited first.
function listSessions(): Session[] {
  const { notesDir } = preferences();
  return readdirSync(notesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => sessionAt(join(notesDir, entry.name)))
    .filter((session) => existsSync(session.notesPath))
    .map((session) => ({ session, modified: statSync(session.notesPath).mtimeMs }))
    .sort((a, b) => b.modified - a.modified)
    .map(({ session }) => session);
}

export default function Command() {
  const { data, isLoading } = usePromise(async () => ({
    sessions: listSessions(),
    active: await activeSessionDir(),
  }));

  async function choose(session: Session) {
    await setActiveSession(session.dir);
    await showHUD(strings.activeSession(session.name), { popToRootType: PopToRootType.Immediate });
  }

  return (
    <List isLoading={isLoading}>
      <List.EmptyView title={strings.noSessions} />
      {data?.sessions.map((session) => (
        <List.Item
          key={session.dir}
          title={session.name}
          icon={Icon.Folder}
          accessories={session.dir === data.active ? [{ tag: strings.activeTag }] : []}
          actions={
            <ActionPanel>
              <Action title={strings.continueSession} icon={Icon.Play} onAction={() => choose(session)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
