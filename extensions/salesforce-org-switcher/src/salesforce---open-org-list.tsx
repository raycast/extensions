import { ActionPanel, Action, Icon, List, showToast, Toast, open, Clipboard } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getAllOrgMeta, getOrgMeta, type OrgMeta } from "./lib/meta";
import { detectCli, getOrgOpenUrl, listOrgs, openOrgPathViaCli, openOrgViaCli, type Org } from "./lib/sf";
import EditOrgMeta from "./components/EditOrgMeta";

export default function Command() {
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [meta, setMeta] = useState<Record<string, OrgMeta>>({});
  const [cli, setCli] = useState<"sf" | "sfdx" | null | "unknown">("unknown");
  const [tagFilter, setTagFilter] = useState<string>("__all__");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [o, m, c] = await Promise.all([listOrgs(), getAllOrgMeta(), detectCli()]);
      setOrgs(o);
      setMeta(m);
      setCli(c);
      setLoading(false);
    })();
  }, []);

  async function refresh() {
    setLoading(true);
    const [o, m, c] = await Promise.all([listOrgs(), getAllOrgMeta(), detectCli()]);
    setOrgs(o);
    setMeta(m);
    setCli(c);
    setLoading(false);
  }

  const items = useMemo(() => {
    const base = orgs
      .slice()
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
      .map((o) => ({ org: o, meta: meta[o.username] ?? {} }));
    // Dropdown tag filter
    const byDropdown =
      tagFilter === "__all__" ? base : base.filter(({ meta }) => (meta.tags ?? []).includes(tagFilter));
    // Query tag filters: tag:foo tag:bar => require all
    const reqTags = Array.from(searchText.matchAll(/(?:^|\s)tag:([^\s]+)/gi)).map((m) => m[1].toLowerCase());
    const negTags = Array.from(searchText.matchAll(/(?:^|\s)-tag:([^\s]+)/gi)).map((m) => m[1].toLowerCase());
    // is:default filter
    const hasIsDefault = /(\s|^)is:default(\s|$)/i.test(searchText);
    const notIsDefault = /(\s|^)-is:default(\s|$)/i.test(searchText);
    // type:scratch|non-scratch filters
    const reqTypes = new Set(
      Array.from(searchText.matchAll(/(?:^|\s)type:(scratch|non-scratch)/gi)).map((m) => m[1].toLowerCase()),
    );
    const negTypes = new Set(
      Array.from(searchText.matchAll(/(?:^|\s)-type:(scratch|non-scratch)/gi)).map((m) => m[1].toLowerCase()),
    );

    return byDropdown.filter(({ meta, org }) => {
      const tags = (meta.tags ?? []).map((t) => t.toLowerCase());
      const includesAll = reqTags.every((t) => tags.includes(t));
      const excludesAll = negTags.every((t) => !tags.includes(t));

      if (!(includesAll && excludesAll)) return false;

      if (hasIsDefault && !org.isDefault) return false;
      if (notIsDefault && org.isDefault) return false;

      const type = org.isScratch ? "scratch" : "non-scratch";
      if (reqTypes.size > 0 && !reqTypes.has(type)) return false;
      if (negTypes.size > 0 && negTypes.has(type)) return false;

      return true;
    });
  }, [orgs, meta, tagFilter, searchText]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    Object.values(meta).forEach((m) => (m.tags ?? []).forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [meta]);

  async function openOrg(org: Org) {
    const target = org.alias || org.username;
    await showToast(Toast.Style.Animated, "Opening org", target);
    const url = await getOrgOpenUrl(target);
    if (url) {
      await open(url);
      await showToast(Toast.Style.Success, "Opened", target);
      return;
    }
    try {
      await openOrgViaCli(target);
      await showToast(Toast.Style.Success, "Opened", target);
    } catch {
      const hint =
        cli === null ? "Install Salesforce CLI (brew install sf)" : "Ensure the org is authorized: sf org login web";
      await showToast(Toast.Style.Failure, "Failed to open org", hint);
    }
  }

  async function openDevConsole(org: Org) {
    const target = org.alias || org.username;
    const path = "/_ui/common/apex/debug/ApexCSIPage"; // Developer Console
    await showToast(Toast.Style.Animated, "Opening Dev Console", target);
    const url = await getOrgOpenUrl(target, path);
    if (url) {
      await open(url);
      await showToast(Toast.Style.Success, "Dev Console opened", target);
      return;
    }
    try {
      await openOrgPathViaCli(target, path);
      await showToast(Toast.Style.Success, "Dev Console opened", target);
    } catch {
      const hint =
        cli === null ? "Install Salesforce CLI (brew install sf)" : "Try again after authorizing: sf org login web";
      await showToast(Toast.Style.Failure, "Failed to open Dev Console", hint);
    }
  }

  async function copyLoginUrl(org: Org) {
    const target = org.alias || org.username;
    try {
      await showToast(Toast.Style.Animated, "Fetching login URL", target);
      const url = await getOrgOpenUrl(target);
      if (!url) throw new Error("no url");
      await Clipboard.copy(url);
      await showToast(Toast.Style.Success, "Login URL copied");
    } catch {
      const hint = cli === null ? "Install Salesforce CLI" : "Ensure org is authorized";
      await showToast(Toast.Style.Failure, "Could not get login URL", hint);
    }
  }

  const emptyTitle = useMemo(() => {
    if (loading) return undefined;
    if (cli === null) return "Salesforce CLI not found";
    if (orgs.length === 0) return "No authorized orgs";
    return undefined;
  }, [loading, cli, orgs.length]);

  const emptyDescription = useMemo(() => {
    if (loading) return undefined;
    if (cli === null) return "Install the Salesforce CLI, then login: brew install sf && sf org login web";
    if (orgs.length === 0) return "Authorize an org via: sf org login web (or sfdx force:auth:web:login)";
    return undefined;
  }, [loading, cli, orgs.length]);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search orgs by label, alias, or username"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by tag" storeValue onChange={(v) => setTagFilter(v)}>
          <List.Dropdown.Item title="All Tags" value="__all__" />
          {allTags.map((t) => (
            <List.Dropdown.Item key={t} title={t} value={t} />
          ))}
        </List.Dropdown>
      }
    >
      {items.length === 0 && emptyTitle && (
        <List.EmptyView
          icon={cli === null ? Icon.Warning : Icon.Info}
          title={emptyTitle}
          description={emptyDescription}
        />
      )}
      {items.map(({ org, meta }) => {
        const title = meta.label || org.alias || org.username;
        const accessories = [
          ...(meta.tags?.slice(0, 2).map((t) => ({ tag: t })) ?? []),
          ...(org.isDefault ? [{ icon: Icon.Star, tooltip: "Default" as const }] : []),
        ];
        return (
          <List.Item
            key={org.username}
            title={title}
            subtitle={org.username}
            keywords={[org.alias ?? "", ...(meta.tags ?? [])]}
            accessories={accessories}
            icon={org.isScratch ? Icon.CubeBox : Icon.Link}
            actions={
              <ActionPanel>
                <Action icon={Icon.Globe} title="Open in Browser" onAction={() => openOrg(org)} />
                <Action icon={Icon.Terminal} title="Open Dev Console" onAction={() => openDevConsole(org)} />
                <Action icon={Icon.Clipboard} title="Copy Login URL" onAction={() => copyLoginUrl(org)} />
                <Action.Push
                  icon={Icon.Tag}
                  title="Edit Label/tags"
                  target={
                    <EditOrgMeta
                      org={org}
                      onSaved={async () => {
                        const updated = await getOrgMeta(org.username);
                        setMeta((m) => ({ ...m, [org.username]: updated }));
                      }}
                    />
                  }
                />
                <Action
                  icon={Icon.XmarkCircle}
                  title="Clear Filters"
                  onAction={async () => {
                    setTagFilter("__all__");
                    setSearchText("");
                    await showToast(Toast.Style.Success, "Filters cleared");
                  }}
                />
                <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={refresh} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
