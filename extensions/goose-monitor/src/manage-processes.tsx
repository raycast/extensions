import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  LaunchType,
  List,
  LocalStorage,
  Toast,
  closeMainWindow,
  environment,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { GENERIC_APP_ICON } from "./lib/app-icon";
import { defaultSort, filterRows, sortRows, visibleCategories, type SortDir, type SortKey } from "./lib/categories";
import { run } from "./lib/exec";
import { cpuExact, fmtCpu, fmtMem, fmtPorts, fmtRate, memExact } from "./lib/format";
import {
  formatHelperRole,
  formatKillError,
  formatProtectedReason,
  formatTransferError,
  type Messages,
} from "./lib/i18n";
import { killProcess } from "./lib/kill";
import { keywordsForRow } from "./lib/search";
import { refreshSnapshot } from "./lib/snapshot";
import type { AppRow, Capabilities, CategoryId, Helper } from "./lib/types";
import { useMessages } from "./locale";
import SettingsTransfer from "./settings-transfer";
import { readSharedSettings, replaceSharedSettings, type SharedSettingsFile } from "./lib/shared-settings";
import type { PortableSettings } from "./lib/settings-transfer";

type Sort = { key: SortKey; dir: SortDir };
type SortOption = Sort & { title: string };
type QuitFn = (row: AppRow, force: boolean, pids?: number[]) => Promise<boolean>;

const CATEGORY_ICON: Record<CategoryId, Icon> = {
  all: Icon.List,
  gui: Icon.AppWindow,
  cpu: Icon.Gauge,
  mem: Icon.MemoryChip,
  net: Icon.Globe,
  bg: Icon.Gear,
};

function categoryTitle(id: CategoryId, t: Messages): string {
  switch (id) {
    case "gui":
      return t.gui;
    case "cpu":
      return t.cpu;
    case "mem":
      return t.memory;
    case "net":
      return t.network;
    case "bg":
      return t.background;
    default:
      return t.all;
  }
}

const sortsOf = (t: Messages): SortOption[] => [
  { key: "cpu", dir: "desc", title: t.sortByCpu },
  { key: "mem", dir: "desc", title: t.sortByMemory },
  { key: "name", dir: "asc", title: t.sortByName },
];

/** 网络分类多三个排序列（对齐 goose-monitor）。 */
const netSortsOf = (t: Messages): SortOption[] => [
  { key: "net", dir: "desc", title: t.sortByNetwork },
  { key: "down", dir: "desc", title: t.sortByDownload },
  { key: "up", dir: "desc", title: t.sortByUpload },
];

export default function ManageProcesses() {
  const t = useMessages();
  const preferences = getPreferenceValues<Preferences>();
  const preferencePath = preferences.sharedSettingsFilePath?.trim() ?? "";
  const { value: overridePath, setValue: setOverridePath } = useLocalStorage<string>("sharedSettingsOverridePath", "");
  const { value: pathMode, setValue: setPathMode } = useLocalStorage<"preference" | "override">(
    "sharedSettingsPathMode",
    "preference",
  );
  const sharedPath = pathMode === "override" ? (overridePath?.trim() ?? "") : preferencePath;
  const { value: storedCategory, setValue: setStoredCategory } = useLocalStorage<CategoryId>("category", "all");
  const category = storedCategory ?? "all";

  // 首帧还没采到能力开关，先当作都可用，跳过采集时沿用缓存避免 Dropdown 闪烁
  const [capabilities, setCapabilities] = useState<Capabilities>({ gui: true, net: true });
  const categories = visibleCategories(capabilities);
  // 存着的分类可能刚被能力开关关掉。
  const activeCategory: CategoryId = categories.some((item) => item.id === category) ? category : "all";
  const isNet = activeCategory === "net";

  const { data, isLoading, revalidate, mutate } = useCachedPromise(
    refreshSnapshot,
    [{ gui: activeCategory === "gui", net: isNet }],
    {
      keepPreviousData: true,
      onData(snapshot) {
        if (activeCategory === "gui") {
          setCapabilities((prev) =>
            prev.gui !== snapshot.capabilities.gui ? { ...prev, gui: snapshot.capabilities.gui } : prev,
          );
        }
        if (activeCategory === "net") {
          setCapabilities((prev) =>
            prev.net !== snapshot.capabilities.net ? { ...prev, net: snapshot.capabilities.net } : prev,
          );
        }
      },
    },
  );

  // 排序选择按普通 / 网络两组分别持久化，没选过就用该分类的默认排序。
  const { value: storedSort, setValue: setStoredSort } = useLocalStorage<Sort>("sort", defaultSort("all"));
  const { value: storedNetworkSort, setValue: setStoredNetworkSort } = useLocalStorage<Sort>(
    "sortNetwork",
    defaultSort("net"),
  );
  const sort = (isNet ? storedNetworkSort : storedSort) ?? defaultSort(activeCategory);
  const sharedBaseline = useRef<SharedSettingsFile | null>(null);
  const [sharedStatus, setSharedStatus] = useState(sharedPath ? t.waitingShared : t.noSharedPath);
  const applyPortableLocally = (settings: PortableSettings) => {
    void LocalStorage.setItem("category", JSON.stringify(settings.category));
    void LocalStorage.setItem("sort", JSON.stringify(settings.sort));
    void LocalStorage.setItem("sortNetwork", JSON.stringify(settings.networkSort));
    setStoredCategory(settings.category);
    setStoredSort(settings.sort);
    setStoredNetworkSort(settings.networkSort);
  };
  const portable: PortableSettings = {
    category,
    sort: storedSort ?? defaultSort("all"),
    networkSort: storedNetworkSort ?? defaultSort("net"),
  };
  const persistPortableChange = async (settings: PortableSettings) => {
    if (!sharedPath) return;
    const baseline = sharedBaseline.current;
    if (!baseline) {
      setSharedStatus(t.sharedUnavailable);
      return;
    }
    try {
      sharedBaseline.current = await replaceSharedSettings(sharedPath, baseline.digest, settings);
      setSharedStatus(t.sharedSynced);
    } catch (error) {
      sharedBaseline.current = null;
      setSharedStatus(`${formatTransferError(error, t)}; ${t.notOverwritten}`);
      await showToast({ style: Toast.Style.Failure, title: t.sharedNotSaved, message: formatTransferError(error, t) });
    }
  };
  useEffect(() => {
    sharedBaseline.current = null;
    if (!sharedPath) {
      setSharedStatus(t.noSharedPath);
      return;
    }
    let active = true;
    const poll = async () => {
      try {
        const next = await readSharedSettings(sharedPath);
        if (!active) return;
        if (sharedBaseline.current?.digest !== next.digest) {
          sharedBaseline.current = next;
          applyPortableLocally(next.settings);
        }
        setSharedStatus(t.sharedConnected);
      } catch (error) {
        if (!active) return;
        sharedBaseline.current = null;
        setSharedStatus(`${formatTransferError(error, t)}; ${t.notOverwritten}`);
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [sharedPath, t]);
  const createShared = async () => {
    const { createSharedSettings } = await import("./lib/shared-settings");
    sharedBaseline.current = await createSharedSettings(sharedPath, portable);
    setSharedStatus(t.sharedFileCreated);
  };
  const selectOverride = async (filePath: string) => {
    if (!filePath.toLowerCase().endsWith(".json")) throw new Error(t.selectDotJson);
    await setOverridePath(filePath);
    await setPathMode("override");
  };
  const createAt = async (filePath: string) => {
    if (!filePath.toLowerCase().endsWith(".json")) throw new Error(t.nameDotJson);
    const created = await import("./lib/shared-settings").then(({ createSharedSettings }) =>
      createSharedSettings(filePath, portable),
    );
    sharedBaseline.current = created;
    await setOverridePath(filePath);
    await setPathMode("override");
    setSharedStatus(t.createdAndSwitched);
  };
  const applyShared = async () => {
    if (!sharedBaseline.current) throw new Error(t.sharedNotRead);
    sharedBaseline.current = await replaceSharedSettings(sharedPath, sharedBaseline.current.digest, portable);
    setSharedStatus(t.localApplied);
  };
  const settingsView = (
    <SettingsTransfer
      sharedPath={sharedPath}
      sharedStatus={sharedStatus}
      preferencePath={preferencePath}
      overridePath={overridePath ?? ""}
      pathMode={pathMode ?? "preference"}
      onUsePreference={() => void setPathMode("preference")}
      onUseOverride={() => void setPathMode("override")}
      onSelectOverride={selectOverride}
      onCreateAt={createAt}
      onImport={(next) => {
        applyPortableLocally(next);
        void persistPortableChange(next);
      }}
      onCreate={createShared}
      onApplyLocal={applyShared}
    />
  );
  const rows = data ? sortRows(filterRows(data.rows, activeCategory), sort.key, sort.dir) : [];

  // 行序会随排序与刷新变化：把选择固定在进程 id 上，回车永远落在用户选中的那个进程。
  // id 失效（已结束 / 被搜索过滤掉）时才交回 Raycast，回到默认首项。
  const [selectedId, setSelectedId] = useState<string>();
  const selected = selectedId && rows.some((row) => row.id === selectedId) ? selectedId : undefined;

  // 轮询与手动刷新共用的受保护刷新：避免 manual refresh 与 interval 重叠或重入。
  const sampling = useRef(false);
  const refresh = async () => {
    if (sampling.current) return;
    sampling.current = true;
    try {
      await revalidate();
    } finally {
      sampling.current = false;
    }
  };

  const refreshDuration = Number(preferences.refreshDuration);
  useEffect(() => {
    if (!refreshDuration || environment.launchType === LaunchType.Background) return;
    const timer = setInterval(() => {
      void refresh();
    }, refreshDuration);
    return () => clearInterval(timer);
  }, [refreshDuration, revalidate]);

  const quit: QuitFn = async (row, force, pids) => {
    const verb = force ? t.forceQuit : t.quit;
    const result = await killProcess(row, { force, pids });
    if (!result.ok) {
      await showToast({
        style: Toast.Style.Failure,
        title: t.couldNot(verb, row.name),
        message: formatKillError(result.error, t),
      });
      await refresh();
      return false;
    }
    await showToast({ style: Toast.Style.Success, title: t.did(verb, row.name) });
    if (pids) {
      // 只结束了组里一个 helper，行还在，等真实快照回来。
      await refresh();
    } else {
      // 乐观移除整行；mutate 结束后自带 revalidate。
      await mutate(undefined, {
        optimisticUpdate: (snapshot) =>
          snapshot && { ...snapshot, rows: snapshot.rows.filter((item) => item.id !== row.id) },
      });
    }
    if (preferences.closeWindowAfterQuit) await closeMainWindow({ clearRootSearch: true });
    return true;
  };

  const openActivityMonitor = async () => {
    try {
      await run("/usr/bin/open", ["-a", "Activity Monitor"]);
    } catch {
      await showToast({ style: Toast.Style.Failure, title: t.couldNotOpenActivityMonitor });
    }
  };

  return (
    <List
      navigationTitle={t.processes}
      isLoading={isLoading && rows.length === 0}
      selectedItemId={selected}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      searchBarPlaceholder={t.searchPlaceholder}
      filtering
      searchBarAccessory={
        <List.Dropdown
          tooltip={t.category}
          value={activeCategory}
          onChange={(next) => {
            const nextCategory = next as CategoryId;
            void setStoredCategory(nextCategory);
            void persistPortableChange({ ...portable, category: nextCategory });
          }}
        >
          {categories.map((item) => (
            <List.Dropdown.Item
              key={item.id}
              value={item.id}
              title={categoryTitle(item.id, t)}
              icon={CATEGORY_ICON[item.id]}
            />
          ))}
        </List.Dropdown>
      }
    >
      {!isLoading && rows.length === 0 && (
        <List.Item title={t.noProcesses} subtitle={t.noProcessesHint} icon={Icon.Info} />
      )}
      {rows.map((row) => (
        <List.Item
          key={row.id}
          title={row.name}
          subtitle={subtitleOf(row, preferences, t)}
          icon={row.iconPath ? { fileIcon: row.iconPath } : { source: GENERIC_APP_ICON, fallback: Icon.AppWindow }}
          keywords={keywordsForRow(row)}
          accessories={accessoriesOf(row, isNet, t)}
          actions={
            <ActionPanel>
              {row.protected ? (
                <>
                  <Action.CopyToClipboard title={t.copyPid} content={`${row.pid}`} />
                  {row.path ? <Action.ShowInFinder title={t.showInFinder} path={row.path} /> : null}
                  {row.path ? <Action.CopyToClipboard title={t.copyPath} content={row.path} /> : null}
                </>
              ) : (
                <>
                  <Action title={t.quit} icon={Icon.XMarkCircle} onAction={() => void quit(row, false)} />
                  <Action
                    title={t.forceQuit}
                    icon={Icon.XMarkCircleFilled}
                    style={Action.Style.Destructive}
                    onAction={() => void quit(row, true)}
                  />
                  {row.helpers.length > 0 ? (
                    <Action.Push
                      title={t.showHelpers}
                      icon={Icon.List}
                      target={<Helpers row={row} quit={quit} t={t} />}
                    />
                  ) : null}
                  <Action.CopyToClipboard title={t.copyPid} content={`${row.pid}`} />
                  {row.path ? <Action.CopyToClipboard title={t.copyPath} content={row.path} /> : null}
                  {row.path ? <Action.ShowInFinder title={t.showInFinder} path={row.path} /> : null}
                </>
              )}
              <Action title={t.openActivityMonitor} icon={Icon.Monitor} onAction={() => void openActivityMonitor()} />
              <ActionPanel.Section>
                {[...sortsOf(t), ...(isNet ? netSortsOf(t) : [])].map((option) => (
                  <Action
                    key={`${option.key}-${option.dir}`}
                    title={option.title}
                    icon={isCurrentSort(option, sort) ? Icon.CheckCircle : undefined}
                    onAction={() => {
                      void (isNet ? setStoredNetworkSort(option) : setStoredSort(option));
                      const next = {
                        ...portable,
                        category: activeCategory,
                        ...(isNet ? { networkSort: option } : { sort: option }),
                      };
                      void persistPortableChange(next);
                    }}
                  />
                ))}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title={t.refresh}
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={() => void refresh()}
                />
                <Action.Push title={t.settingsAndTransfer} icon={Icon.Gear} target={settingsView} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
      <List.Item
        id="settings"
        title={t.settingsAndTransfer}
        icon={Icon.Gear}
        actions={
          <ActionPanel>
            <Action.Push title={t.settingsAndTransfer} icon={Icon.Gear} target={settingsView} />
          </ActionPanel>
        }
      />
    </List>
  );
}

/** 端口 / 受保护原因 / 可选的 PID、路径 —— 标题里已有的名字不再重复，辅助进程数也不重复。 */
function subtitleOf(row: AppRow, preferences: Preferences, t: Messages): string {
  const parts: string[] = [];
  if (row.ports.length) parts.push(t.portLabel(fmtPorts(row.ports)));
  if (row.protectedReason) parts.push(formatProtectedReason(row.protectedReason, t));
  if (preferences.showPID) parts.push(t.pidLabel(row.pid));
  if (preferences.showPath) parts.push(row.path);
  return parts.join(" · ");
}

function accessoriesOf(row: AppRow, isNet: boolean, t: Messages): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (row.protected) {
    const reason = formatProtectedReason(row.protectedReason, t);
    accessories.push({
      tag: { value: t.protected, color: Color.SecondaryText },
      tooltip: reason ? t.protectedWith(reason) : t.protected,
    });
  }
  if (isNet) {
    accessories.push({
      text: fmtRate(row.netDown),
      icon: Icon.ArrowDown,
      tooltip: t.download(fmtRate(row.netDown)),
    });
    accessories.push({ text: fmtRate(row.netUp), icon: Icon.ArrowUp, tooltip: t.upload(fmtRate(row.netUp)) });
  }
  accessories.push({ text: fmtCpu(row.cpu), icon: Icon.Gauge, tooltip: t.cpuValue(cpuExact(row.cpu)) });
  accessories.push({
    text: fmtMem(row.memBytes),
    icon: Icon.MemoryChip,
    tooltip: t.memoryValue(memExact(row.memBytes)),
  });
  return accessories;
}

const isCurrentSort = (option: SortOption, sort: Sort): boolean => option.key === sort.key && option.dir === sort.dir;

/** 子进程页：helper 可以单独结束，不需要回主列表。 */
function Helpers({ row, quit, t }: { row: AppRow; quit: QuitFn; t: Messages }) {
  const { pop } = useNavigation();
  const quitHelper = async (helper: Helper, force = false) => {
    if (await quit(row, force, [helper.pid])) pop();
  };
  return (
    <List navigationTitle={t.helpersNav(row.name)}>
      {row.helpers.map((helper) => (
        <List.Item
          key={`${row.id}:${helper.pid}`}
          title={helper.name}
          subtitle={formatHelperRole(helper.role, t)}
          icon={Icon.Gear}
          accessories={[
            { text: fmtCpu(helper.cpu), icon: Icon.Gauge, tooltip: t.cpuValue(cpuExact(helper.cpu)) },
            {
              text: fmtMem(helper.memBytes),
              icon: Icon.MemoryChip,
              tooltip: t.memoryValue(memExact(helper.memBytes)),
            },
            { text: t.pidLabel(helper.pid) },
          ]}
          actions={
            <ActionPanel>
              <Action title={t.quitHelper} icon={Icon.XMarkCircle} onAction={() => void quitHelper(helper, false)} />
              <Action
                title={t.forceQuitHelper}
                icon={Icon.XMarkCircleFilled}
                style={Action.Style.Destructive}
                onAction={() => void quitHelper(helper, true)}
              />
              <Action.CopyToClipboard title={t.copyPid} content={`${helper.pid}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
