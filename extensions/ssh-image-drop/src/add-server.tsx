import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { deleteServerFlow, ServerForm } from "./components/ServerForm";
import { AuthMode } from "./lib/transferArgs";
import { ManagedEntry } from "./lib/sshConfigText";
import { getAuthMode } from "./runtime/store";
import { getManagedEntry, readAllHosts } from "./runtime/system";

interface Row {
  alias: string;
  entry: ManagedEntry | null;
  authMode: AuthMode;
}

/**
 * Manage Servers — 관리 서버(managed config)의 추가·수정·삭제 단일 진입점.
 * v2에서 전송 셀렉터 리스트가 clipboard/pull 위임 경로에서만 뜨게 되어(콘텐츠 없으면 진입 불가)
 * 관리 기능이 고립됐던 것을 해소한다. ~/.ssh/config·recents 항목은 여기서 다루지 않는다(불변 원칙).
 */
export default function ManageServers() {
  const { data, isLoading, revalidate } = usePromise(
    async (): Promise<Row[]> => {
      const aliases = readAllHosts().managed;
      return Promise.all(
        aliases.map(async (alias) => ({
          alias,
          entry: getManagedEntry(alias),
          authMode: await getAuthMode(alias),
        })),
      );
    },
  );
  const rows = data ?? [];

  // 서버 0개면 목록 대신 바로 추가 폼 — 등록 성공 시 onDone(revalidate)이 목록 뷰로 전환한다
  if (!isLoading && rows.length === 0)
    return <ServerForm mode={{ kind: "add", onDone: revalidate }} />;

  const addAction = (
    <Action.Push
      title="Add Server"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<ServerForm mode={{ kind: "add", onDone: revalidate }} />}
    />
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Manage Servers"
      searchBarPlaceholder="Search servers…"
    >
      {rows.map((row) => (
        <List.Item
          key={row.alias}
          title={row.alias}
          icon={Icon.HardDrive}
          subtitle={
            row.entry
              ? `${row.entry.user}@${row.entry.hostName}:${row.entry.port}`
              : undefined
          }
          accessories={[
            row.authMode === "key"
              ? { tag: { value: "SSH key", color: Color.Green } }
              : { tag: { value: "password", color: Color.Blue } },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Server"
                icon={Icon.Pencil}
                target={
                  <ServerForm
                    mode={{
                      kind: "edit",
                      alias: row.alias,
                      onDone: revalidate,
                    }}
                  />
                }
              />
              {addAction}
              <ActionPanel.Section>
                <Action
                  title="Delete Server"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => deleteServerFlow(row.alias, revalidate)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
