import { Action, ActionPanel, Color, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { Account, removeAccount } from "./accounts";
import { AuthForm } from "./auth-form";
import { RunList } from "./run-list";
import { getProjects, getViewer, projectUrl, Viewer } from "./wandb";

interface EntityOption {
  value: string; // `${username}::${entity}`
  key: string;
  entity: string;
  username: string;
}

/** Map a W&B project access value to a Visibility accessory (like the web table). */
function visibilityAccessory(access: string | null): List.Item.Accessory {
  switch (access) {
    case "PUBLIC":
      return { icon: Icon.Globe, text: "Public", tooltip: "Project visibility" };
    case "OPEN":
      return { icon: Icon.Globe, text: "Open", tooltip: "Project visibility" };
    case "PRIVATE":
      return { icon: Icon.TwoPeople, text: "Team", tooltip: "Project visibility" };
    default:
      return { icon: Icon.Lock, text: access ?? "—", tooltip: "Project visibility" };
  }
}

export function ProjectList({
  accounts,
  onAccountsChanged,
}: {
  accounts: Account[];
  onAccountsChanged: () => void | Promise<void>;
}) {
  const { push, pop } = useNavigation();

  // Fetch the viewer (entities) for every account. allSettled so one bad key
  // doesn't blank the whole list.
  const { data: viewers, isLoading: loadingViewers } = usePromise(
    async (accts: Account[]) => {
      const results = await Promise.allSettled(
        accts.map(async (a) => ({ account: a, viewer: await getViewer(a.key) })),
      );
      return results
        .filter((r): r is PromiseFulfilledResult<{ account: Account; viewer: Viewer }> => r.status === "fulfilled")
        .map((r) => r.value);
    },
    [accounts],
  );

  const options = useMemo<EntityOption[]>(() => {
    const out: EntityOption[] = [];
    for (const { account, viewer } of viewers ?? []) {
      for (const entity of viewer.entities) {
        out.push({ value: `${account.username}::${entity}`, key: account.key, entity, username: account.username });
      }
    }
    return out;
  }, [viewers]);

  const [selected, setSelected] = useState<string>("");
  useEffect(() => {
    if (options.length > 0 && !options.some((o) => o.value === selected)) {
      setSelected(options[0].value);
    }
  }, [options, selected]);

  const current = options.find((o) => o.value === selected);

  const { data: projects, isLoading: loadingProjects } = usePromise(
    async (sel: string) => {
      const o = options.find((x) => x.value === sel);
      return o ? getProjects(o.key, o.entity) : [];
    },
    [selected],
  );

  async function removeCurrent() {
    if (!current) return;
    await removeAccount(current.username);
    await showToast({ style: Toast.Style.Success, title: `Removed @${current.username}` });
    setSelected("");
    await onAccountsChanged();
  }

  return (
    <List
      isLoading={loadingViewers || loadingProjects}
      searchBarPlaceholder="Filter projects…"
      searchBarAccessory={
        viewers && viewers.length > 0 ? (
          <List.Dropdown tooltip="Account / Entity" value={selected} onChange={setSelected}>
            {viewers.map(({ account, viewer }) => (
              <List.Dropdown.Section key={account.username} title={`@${account.username}`}>
                {viewer.entities.map((e) => (
                  <List.Dropdown.Item key={`${account.username}::${e}`} title={e} value={`${account.username}::${e}`} />
                ))}
              </List.Dropdown.Section>
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.EmptyView
        title={current ? "No projects" : "No accessible accounts"}
        description={current ? `${current.entity} has no projects.` : "Add a W&B account to get started."}
        actions={
          <ActionPanel>
            <Action
              title="Add Account"
              icon={Icon.PlusCircle}
              onAction={() => push(<AuthForm onDone={onAccountsChanged} />)}
            />
          </ActionPanel>
        }
      />
      {current &&
        (projects ?? []).map((p) => (
          <List.Item
            key={p.id}
            icon={{ source: Icon.LineChart, tintColor: Color.Purple }}
            title={p.name}
            accessories={[
              visibilityAccessory(p.access),
              { icon: Icon.BarChart, text: `${p.runCount ?? 0} runs`, tooltip: "Runs" },
              p.lastActive
                ? { date: new Date(p.lastActive), tooltip: "Last active" }
                : { text: "—", tooltip: "Never active" },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Runs"
                  icon={Icon.List}
                  target={<RunList token={current.key} entity={current.entity} project={p.name} />}
                />
                <Action.OpenInBrowser title="Open Project" url={projectUrl(current.entity, p.name)} />
                <Action.CopyToClipboard title="Copy Project URL" content={projectUrl(current.entity, p.name)} />
                <ActionPanel.Section>
                  <Action
                    title="Add Account"
                    icon={Icon.PlusCircle}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() =>
                      push(
                        <AuthForm
                          onDone={async () => {
                            await onAccountsChanged();
                            pop();
                          }}
                        />,
                      )
                    }
                  />
                  <Action
                    title={`Remove @${current.username}`}
                    icon={Icon.Logout}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                    onAction={removeCurrent}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
