import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showToast,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { existsSync } from "fs";
import { basename } from "path";
import { useMemo, useRef, useState } from "react";
import {
  SearchResult,
  VaultFile,
  listVaultFiles,
  parseExtensions,
  readFilePreview,
  searchVaultFiles,
} from "./lib/search";
import {
  TOLARIA_APP_PATH,
  TolariaVault,
  buildTolariaDeepLink,
  readTolariaVaults,
  vaultDisplayName,
} from "./lib/tolaria";

interface VaultChoice {
  path: string;
  title: string;
}

function useVaultChoices(preferencePath: string | undefined) {
  return useMemo(() => {
    const { vaults, activeVault } = readTolariaVaults();
    const choices: VaultChoice[] = vaults.map((vault) => ({ path: vault.path, title: vaultDisplayName(vault) }));
    if (preferencePath && !choices.some((choice) => choice.path === preferencePath)) {
      choices.unshift({ path: preferencePath, title: basename(preferencePath) });
    }
    const defaultPath = preferencePath || activeVault || choices[0]?.path;
    return { vaults, choices, defaultPath };
  }, [preferencePath]);
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences.SearchNotes>();
  const preferencePath = preferences.vaultPath?.trim() || undefined;
  const { vaults, choices, defaultPath } = useVaultChoices(preferencePath);

  const [vaultPath, setVaultPath] = useState<string | undefined>(defaultPath);
  const [searchText, setSearchText] = useState("");
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const abortable = useRef<AbortController>(null);

  const rootExists = !!vaultPath && existsSync(vaultPath);

  const {
    data: files,
    isLoading: isLoadingFiles,
    revalidate,
  } = useCachedPromise(
    (root: string, extensions: string) => listVaultFiles(root, parseExtensions(extensions)),
    [vaultPath ?? "", preferences.extensions ?? ""],
    { execute: rootExists, keepPreviousData: true },
  );

  const { data: results, isLoading: isSearching } = usePromise(
    (allFiles: VaultFile[], query: string, includeContent: boolean, fuzzy: boolean) =>
      searchVaultFiles(allFiles, query, includeContent, fuzzy, abortable.current?.signal),
    [files ?? [], searchText, preferences.searchContent !== false, preferences.fuzzySearch !== false],
    { abortable, execute: !!files },
  );

  const { nameMatches, contentMatches } = useMemo(() => {
    const all = results ?? [];
    return {
      nameMatches: all.filter((result) => result.nameMatch || !searchText.trim()),
      contentMatches: all.filter((result) => !result.nameMatch && searchText.trim()),
    };
  }, [results, searchText]);

  const vaultDropdown =
    choices.length > 1 ? (
      <List.Dropdown tooltip="Tolaria Vault" value={vaultPath} onChange={setVaultPath}>
        {choices.map((choice) => (
          <List.Dropdown.Item key={choice.path} title={choice.title} value={choice.path} icon={Icon.Folder} />
        ))}
      </List.Dropdown>
    ) : undefined;

  if (!rootExists) {
    return (
      <List searchBarAccessory={vaultDropdown}>
        <List.EmptyView
          icon={Icon.Folder}
          title="No Tolaria folder found"
          description="Set the Vault Folder in the extension preferences."
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const renderItem = (result: SearchResult) => (
    <ResultItem
      key={result.file.path}
      result={result}
      vaults={vaults}
      vaultPath={vaultPath}
      isShowingDetail={isShowingDetail}
      onToggleDetail={() => setIsShowingDetail((value) => !value)}
      onReload={revalidate}
    />
  );

  return (
    <List
      isLoading={isLoadingFiles || isSearching}
      filtering={false}
      throttle
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search file names and content…"
      searchBarAccessory={vaultDropdown}
      isShowingDetail={isShowingDetail}
    >
      <List.EmptyView icon={Icon.MagnifyingGlass} title={searchText ? "No matching files" : "No files found"} />
      <List.Section
        title={searchText.trim() ? "File Name Matches" : "Recently Modified"}
        subtitle={String(nameMatches.length)}
      >
        {nameMatches.map(renderItem)}
      </List.Section>
      <List.Section title="Content Matches" subtitle={String(contentMatches.length)}>
        {contentMatches.map(renderItem)}
      </List.Section>
    </List>
  );
}

function ResultItem(props: {
  result: SearchResult;
  vaults: TolariaVault[];
  vaultPath: string;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  onReload: () => void;
}) {
  const { result, vaults, vaultPath, isShowingDetail, onToggleDetail, onReload } = props;
  const { file } = result;
  const deepLink = buildTolariaDeepLink(file.path, vaults, vaultPath);
  const modified = new Date(file.modifiedAt);

  const accessories: List.Item.Accessory[] = isShowingDetail
    ? []
    : [
        ...(result.snippet && file.folder ? [{ tag: file.folder }] : []),
        { date: modified, tooltip: `Modified ${modified.toLocaleString()}` },
      ];

  return (
    <List.Item
      title={file.name}
      subtitle={isShowingDetail ? undefined : (result.snippet ?? file.folder)}
      icon={result.snippet ? Icon.Text : Icon.Document}
      keywords={[file.relativePath]}
      accessories={accessories}
      detail={isShowingDetail ? <FileDetail file={file} result={result} /> : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {deepLink ? (
              <Action.Open title="Open in Tolaria" target={deepLink} icon={{ fileIcon: TOLARIA_APP_PATH }} />
            ) : (
              <Action
                title="Open in Tolaria"
                icon={{ fileIcon: TOLARIA_APP_PATH }}
                onAction={async () => {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Not in a Tolaria vault",
                    message: "Add this folder as a vault in Tolaria first.",
                    primaryAction: { title: "Open Tolaria", onAction: () => open(TOLARIA_APP_PATH) },
                  });
                }}
              />
            )}
            <Action.Open title="Open with Default App" target={file.path} shortcut={Keyboard.Shortcut.Common.Open} />
            <Action.ShowInFinder path={file.path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={isShowingDetail ? "Hide Preview" : "Show Preview"}
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={onToggleDetail}
            />
            {deepLink && (
              <Action.CopyToClipboard
                title="Copy Deep Link"
                content={deepLink}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            )}
            <Action.CopyToClipboard
              title="Copy File Path"
              content={file.path}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
            <Action
              title="Reload Files"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onReload}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function FileDetail({ file, result }: { file: VaultFile; result: SearchResult }) {
  const { data: preview, isLoading } = usePromise(readFilePreview, [file]);
  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={preview ?? ""}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Path" text={file.relativePath} />
          {result.line !== undefined && (
            <List.Item.Detail.Metadata.Label title="First Match" text={`Line ${result.line}`} />
          )}
          <List.Item.Detail.Metadata.Label title="Modified" text={new Date(file.modifiedAt).toLocaleString()} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
