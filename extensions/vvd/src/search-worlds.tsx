import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api"

import { WorldsGate } from "./components/worlds-gate"
import { useWorlds } from "./lib/use-worlds"
import { worldUrl } from "./lib/urls"
import { type Connection, type World, canEdit } from "./lib/vvd"
import { CaptureForm } from "./views/capture-form"
import { WorldSearch } from "./views/world-search"

export default function Command() {
  return (
    <WorldsGate>
      {(connection, worlds) => (
        <Worlds connection={connection} worlds={worlds} />
      )}
    </WorldsGate>
  )
}

function Worlds({
  connection,
  worlds,
}: {
  connection: Connection
  worlds: World[]
}) {
  const { isLoading, revalidate } = useWorlds(connection)
  const yours = worlds.filter(canEdit)
  const shared = worlds.filter((w) => !canEdit(w))

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your worlds…">
      <WorldSection
        title="Yours"
        worlds={yours}
        connection={connection}
        all={worlds}
        refresh={revalidate}
      />
      <WorldSection
        title="Shared with you"
        worlds={shared}
        connection={connection}
        all={worlds}
        refresh={revalidate}
      />
    </List>
  )
}

function WorldSection({
  title,
  worlds,
  all,
  connection,
  refresh,
}: {
  title: string
  worlds: World[]
  all: World[]
  connection: Connection
  refresh: () => void
}) {
  if (worlds.length === 0) return null
  return (
    <List.Section title={title} subtitle={String(worlds.length)}>
      {worlds.map((world) => {
        const url = worldUrl(connection.origin, world.slug)
        return (
          <List.Item
            key={world.id}
            icon={Icon.Globe}
            title={world.name}
            subtitle={world.slug}
            keywords={[world.slug]}
            accessories={[
              {
                tag: {
                  value: roleLabel(world.role),
                  color: roleColor(world.role),
                },
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser title="Open in Browser" url={url} />
                  <Action.Push
                    title="Search This World"
                    icon={Icon.MagnifyingGlass}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "f" },
                      Windows: { modifiers: ["ctrl"], key: "f" },
                    }}
                    target={
                      <WorldSearch
                        connection={connection}
                        worlds={all}
                        initialWorldId={world.id}
                      />
                    }
                  />
                  {canEdit(world) ? (
                    <Action.Push
                      title="Quick Capture Here"
                      icon={Icon.Plus}
                      shortcut={Keyboard.Shortcut.Common.New}
                      target={
                        <CaptureForm
                          connection={connection}
                          worlds={all}
                          initialWorldId={world.id}
                        />
                      }
                    />
                  ) : null}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Link"
                    content={url}
                    shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
                  />
                  <Action.CopyToClipboard
                    title="Copy World ID"
                    content={world.id}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={refresh}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        )
      })}
    </List.Section>
  )
}

function roleLabel(role: string): string {
  switch (role) {
    case "owner":
      return "Owner"
    case "admin":
      return "Admin"
    case "editor":
      return "Editor"
    case "viewer":
      return "Viewer"
    default:
      return role
  }
}

function roleColor(role: string): Color {
  return canEdit({ role }) ? Color.Green : Color.SecondaryText
}
