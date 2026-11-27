import { Action, ActionPanel, Clipboard, Icon, List, MenuBarExtra, open } from "@raycast/api";
import { useMemo } from "react";
import type { MiseLocation } from "../mise/locate";
import { findMiseUpdate, INSTALL_DOCS_URL, type MiseUpdate } from "../mise/update";
import { commandLine } from "../terminal/script";
import { RunInTerminalAction, runInTerminal } from "./runInTerminal";

function useMiseUpdate(location: MiseLocation): MiseUpdate | undefined {
  return useMemo(() => findMiseUpdate(location), [location]);
}

const title = (update: MiseUpdate) => `mise ${update.latest} available`;
const subtitle = (update: MiseUpdate) => `${update.current} → ${update.latest}`;

export function MiseUpdateListItem({ location }: { location: MiseLocation }) {
  const update = useMiseUpdate(location);
  if (!update) return null;
  const command = update.argv && commandLine(update.argv);
  return (
    <List.Item
      title={title(update)}
      subtitle={subtitle(update)}
      icon={Icon.ArrowUpCircle}
      actions={
        <ActionPanel>
          {command ? (
            <>
              <RunInTerminalAction title="Update in Terminal" command={command} />
              <Action.CopyToClipboard title="Copy Command" content={command} />
            </>
          ) : (
            <Action.OpenInBrowser title="Open Install Docs" url={INSTALL_DOCS_URL} />
          )}
        </ActionPanel>
      }
    />
  );
}

export function MiseUpdateMenuSection({ location }: { location: MiseLocation }) {
  const update = useMiseUpdate(location);
  if (!update) return null;
  const command = update.argv && commandLine(update.argv);
  return (
    <MenuBarExtra.Section>
      <MenuBarExtra.Item
        title={title(update)}
        subtitle={subtitle(update)}
        icon={Icon.ArrowUpCircle}
        onAction={() => (command ? runInTerminal(command) : open(INSTALL_DOCS_URL))}
        alternate={
          command ? (
            <MenuBarExtra.Item title="Copy Command" icon={Icon.Clipboard} onAction={() => Clipboard.copy(command)} />
          ) : undefined
        }
      />
    </MenuBarExtra.Section>
  );
}
