import { Action, ActionPanel, Icon, type LaunchProps, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { parseBackendQuery, searchBackend, type Backend, type BackendResult } from "./mise/backends";
import type { ConfigFile } from "./mise/config";
import { listInstalled, type InstalledTool } from "./mise/installed";
import type { MiseLocation } from "./mise/locate";
import { backendKind, listRegistry, type RegistryTool } from "./mise/registry";
import { listRemote } from "./mise/remote";
import { miseCommandLine } from "./terminal/script";
import { docsUrl } from "./ui/docsUrl";
import { addGloballyTo, InstallTargetDropdown, UseGloballyIn, useInstallTarget } from "./ui/InstallTarget";
import { LoadError, loadErrorInView } from "./ui/LoadError";
import { MissingMise } from "./ui/MissingMise";
import { readPreferences } from "./ui/preferences";
import { RunInTerminalAction } from "./ui/runInTerminal";
import { runOperation } from "./ui/runOperation";
import { useMise } from "./ui/useMise";

const PLACEHOLDER = "Search tools or npm:, cargo:, gem:…";

export default function Command(props: LaunchProps) {
  const mise = useMise();
  if (mise.status === "loading") return <List isLoading searchBarPlaceholder={PLACEHOLDER} />;
  if (mise.status === "missing") return <MissingMise searched={mise.searched} />;
  return <SearchTools location={mise.location} initialSearchText={props.fallbackText ?? ""} />;
}

function SearchTools({ location, initialSearchText }: { location: MiseLocation; initialSearchText: string }) {
  const registry = useCachedPromise(listRegistry, [location], loadErrorInView);
  const installed = useCachedPromise(listInstalled, [location]);
  const install = useInstallTarget(location);
  const [prefs] = useState(() => readPreferences<Preferences.SearchTools>());
  const [showDetail, setShowDetail] = useState(prefs.showDetails);
  const [searchText, setSearchText] = useState(initialSearchText);

  const backendQuery = parseBackendQuery(searchText);
  const backend = useCachedPromise(
    (kind: Backend, query: string) =>
      searchBackend(kind, query, { fetch, listRemote: (spec) => listRemote(location, spec) }),
    [backendQuery?.backend ?? "npm", backendQuery?.query ?? ""],
    { execute: backendQuery !== undefined, keepPreviousData: true },
  );

  const installedByName = new Map((installed.data ?? []).map((tool) => [tool.name, tool]));
  const tools = registry.data ?? [];
  const installedTools = tools.filter((tool) => installedByName.has(tool.short));
  const otherTools = tools.filter((tool) => !installedByName.has(tool.short));
  const backendResults = backendQuery ? (backend.data ?? []) : [];
  const isLoading = registry.isLoading || installed.isLoading || backend.isLoading;

  const useGlobally = (spec: string, configFile: string) =>
    addGloballyTo(spec, undefined, { configFile, jobs: prefs.jobs });
  const installGlobally = (spec: string, configFile: string) =>
    runOperation(location, useGlobally(spec, configFile), installed.revalidate);
  const itemProps = (spec: string) => ({
    installed: installedByName.get(spec),
    showDetail,
    configFiles: install.files,
    onUseGlobally: () => installGlobally(spec, install.target),
    onUseGloballyIn: (configFile: string) => installGlobally(spec, configFile),
    terminalCommand: miseCommandLine(location, useGlobally(spec, install.target)),
    onToggleDetail: () => setShowDetail((value) => !value),
  });

  const renderRegistryTool = (tool: RegistryTool) => (
    <ToolItem
      key={tool.short}
      title={tool.short}
      description={tool.description}
      keywords={[...tool.aliases, ...tool.bins]}
      tag={backendKind(tool)}
      link={{ title: "Open Documentation", url: docsUrl(tool) }}
      markdown={registryMarkdown(tool)}
      {...itemProps(tool.short)}
    />
  );

  const renderBackendResult = (result: BackendResult) => (
    <ToolItem
      key={result.spec}
      title={result.spec}
      description={result.description}
      keywords={[searchText]}
      tag={result.backend}
      version={result.version}
      link={result.url ? { title: "Open Package Page", url: result.url } : undefined}
      markdown={backendMarkdown(result)}
      {...itemProps(result.spec)}
    />
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      searchBarPlaceholder={PLACEHOLDER}
      searchBarAccessory={
        install.isLoading ? null : <InstallTargetDropdown files={install.files} onChange={install.setTarget} />
      }
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={true}
      throttle
    >
      {registry.error && !registry.data ? (
        <LoadError error={registry.error} retry={registry.revalidate} />
      ) : (
        !isLoading && (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title={backendQuery ? `No ${backendQuery.backend} packages match` : "No tools match"}
            description={backendQuery ? "Check the package name" : "Try a bin name, an alias, or a backend prefix"}
          />
        )
      )}
      {backendQuery && (
        <List.Section title={`${backendQuery.backend} results`} subtitle={String(backendResults.length)}>
          {backendResults.map(renderBackendResult)}
        </List.Section>
      )}
      <List.Section title="Installed" subtitle={String(installedTools.length)}>
        {installedTools.map(renderRegistryTool)}
      </List.Section>
      <List.Section title="Registry" subtitle={String(otherTools.length)}>
        {otherTools.map(renderRegistryTool)}
      </List.Section>
    </List>
  );
}

function ToolItem({
  title,
  description,
  keywords,
  tag,
  version,
  link,
  markdown,
  installed,
  showDetail,
  configFiles,
  onUseGlobally,
  onUseGloballyIn,
  terminalCommand,
  onToggleDetail,
}: {
  title: string;
  description: string;
  keywords: string[];
  tag: string;
  version?: string;
  link: { title: string; url: string } | undefined;
  markdown: string;
  installed: InstalledTool | undefined;
  showDetail: boolean;
  configFiles: ConfigFile[];
  onUseGlobally: () => void;
  onUseGloballyIn: (configFile: string) => void;
  terminalCommand: string;
  onToggleDetail: () => void;
}) {
  const accessories: List.Item.Accessory[] = [{ tag }];
  if (version) accessories.push({ text: version });
  if (installed)
    accessories.push({ text: installed.versions.map((v) => v.version).join(", "), icon: Icon.CheckCircle });

  return (
    <List.Item
      title={title}
      subtitle={showDetail || !description ? undefined : description}
      keywords={keywords}
      accessories={accessories}
      detail={<List.Item.Detail markdown={`${markdown}\n\n${installedMarkdown(installed)}`} />}
      actions={
        <ActionPanel>
          <Action title="Use Globally" icon={Icon.Plus} onAction={onUseGlobally} />
          <UseGloballyIn files={configFiles} onSelect={onUseGloballyIn} />
          <RunInTerminalAction command={terminalCommand} />
          {link && <Action.OpenInBrowser title={link.title} url={link.url} />}
          <Action.CopyToClipboard title="Copy Install Command" content={`mise use -g ${title}`} />
          <Action
            title="Toggle Details"
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            onAction={onToggleDetail}
          />
        </ActionPanel>
      }
    />
  );
}

function registryMarkdown(tool: RegistryTool): string {
  const list = (items: string[]) => (items.length ? items.map((item) => `\`${item}\``).join(", ") : "—");
  return [
    `# ${tool.short}`,
    "",
    tool.description,
    "",
    `**Bins:** ${list(tool.bins)}`,
    "",
    `**Backends:** ${list(tool.backends)}`,
    "",
    `**Aliases:** ${list(tool.aliases)}`,
  ].join("\n");
}

function backendMarkdown(result: BackendResult): string {
  return [
    `# ${result.name}`,
    "",
    result.description || "—",
    "",
    `**Backend:** \`${result.backend}\``,
    "",
    `**Version:** ${result.version ?? "—"}`,
  ].join("\n");
}

function installedMarkdown(installed: InstalledTool | undefined): string {
  const versions = installed
    ? installed.versions.map((v) => `- ${v.version}${v.active ? " (active)" : ""}`).join("\n")
    : "Not installed";
  return ["## Installed", "", versions].join("\n");
}
