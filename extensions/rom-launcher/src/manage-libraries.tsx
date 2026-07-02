import {
  List,
  Form,
  ActionPanel,
  Action,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
  Icon,
  getPreferenceValues,
  Color,
  environment,
} from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import * as fs from "fs";
import * as path from "path";
import { Library, PLATFORMS, Game } from "./types";
import { getMetadata, Metadata } from "./utils/metadata";
import { scanLibraries } from "./utils/scanner";

function getConsoleIcon(consoleId: string) {
  const key = consoleId.toLowerCase();

  const customMap: Record<string, string> = {
    mame: "mame",
    fbneo: "fbneo",
    arcade: "arcade",
    neogeo: "neogeo",
  };

  const fileName = customMap[key] || key;

  return {
    source: `${fileName}.png`,
    fallback: Icon.GameController,
    tintColor: Color.PrimaryText,
  };
}

function getInstalledCores(
  coreList: string[] | undefined,
  availableCoresSet: Set<string>,
): string[] {
  if (!coreList || availableCoresSet.size === 0) return [];

  const ext =
    process.platform === "win32"
      ? ".dll"
      : process.platform === "darwin"
        ? ".dylib"
        : ".so";

  return coreList.filter((core) => {
    const fullName = core.endsWith(ext) ? core : `${core}${ext}`;
    return availableCoresSet.has(fullName);
  });
}

export default function ManageLibraries({
  onRefresh,
}: {
  onRefresh?: () => void;
}) {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData(force = false) {
    setIsLoading(true);
    if (force) {
      await showToast({
        title: "Updating Database...",
        style: Toast.Style.Animated,
      });
    }

    try {
      const { data, lastUpdate: timestamp } = await getMetadata(force);
      setMetadata(data);
      setLastUpdate(timestamp);

      const libData = await LocalStorage.getItem<string>("libraries");
      let parsedLibraries: Library[] = [];
      if (libData) {
        parsedLibraries = JSON.parse(libData);
        setLibraries(parsedLibraries);
      }

      if (force && data) {
        const scannedGames = await scanLibraries(parsedLibraries, data);
        const cachePath = path.join(environment.supportPath, "gamesCache.json");
        await fs.promises.writeFile(
          cachePath,
          JSON.stringify(scannedGames),
          "utf8",
        );
      }

      if (force) {
        await showToast({
          title: "Database Updated",
          style: Toast.Style.Success,
        });
        onRefresh?.();
      }
    } catch (error) {
      await showToast({
        title: "Update Failed",
        message: String(error),
        style: Toast.Style.Failure,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteLibrary(id: string) {
    const updated = libraries.filter((l) => l.id !== id);

    // Update local state so the UI reflects the deletion immediately
    setLibraries(updated);

    await LocalStorage.setItem("libraries", JSON.stringify(updated));

    const cachePath = path.join(environment.supportPath, "gamesCache.json");
    try {
      if (fs.existsSync(cachePath)) {
        const cacheRaw = await fs.promises.readFile(cachePath, "utf8");
        const currentCache = JSON.parse(cacheRaw) as Game[];
        const newCache = currentCache.filter((g) => g.libraryId !== id);
        await fs.promises.writeFile(
          cachePath,
          JSON.stringify(newCache),
          "utf8",
        );
      }
    } catch (e) {
      /* ignore */
    }

    // Refresh the index.tsx view in the background
    onRefresh?.();

    showToast({ title: "Library Removed", style: Toast.Style.Success });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search libraries...">
      <List.EmptyView
        icon={Icon.Plus}
        title="No Libraries Installed"
        description="Press Enter to add your first ROM folder."
        actions={
          <ActionPanel>
            <Action
              title="Add New Library"
              icon={Icon.Plus}
              shortcut={
                process.platform === "darwin"
                  ? { modifiers: ["cmd"], key: "n" }
                  : { modifiers: ["ctrl"], key: "n" }
              }
              onAction={() =>
                metadata &&
                push(
                  <LibraryForm
                    libraries={libraries}
                    metadata={metadata}
                    onSave={(updatedLibs) => {
                      setLibraries(updatedLibs);
                      onRefresh?.();
                    }}
                  />,
                )
              }
            />
            <Action
              title="Force Update Metadata"
              icon={Icon.Download}
              shortcut={
                process.platform === "darwin"
                  ? { modifiers: ["cmd", "shift"], key: "u" }
                  : { modifiers: ["ctrl", "shift"], key: "u" }
              }
              onAction={() => loadData(true)}
            />
          </ActionPanel>
        }
      />

      {libraries.length > 0 && (
        <List.Section title="Installed Libraries">
          {libraries.map((lib) => (
            <List.Item
              key={lib.id}
              icon={getConsoleIcon(lib.console)}
              title={metadata?.systems[lib.console]?.name || lib.console}
              subtitle={lib.path}
              accessories={[{ text: lib.core }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Edit Library"
                    icon={Icon.Pencil}
                    onAction={() =>
                      metadata &&
                      push(
                        <LibraryForm
                          libraries={libraries}
                          metadata={metadata}
                          existingLibrary={lib}
                          onSave={(updatedLibs) => {
                            setLibraries(updatedLibs);
                            onRefresh?.();
                          }}
                        />,
                      )
                    }
                  />
                  <Action
                    title="Add New Library"
                    icon={Icon.Plus}
                    shortcut={
                      process.platform === "darwin"
                        ? { modifiers: ["cmd"], key: "n" }
                        : { modifiers: ["ctrl"], key: "n" }
                    }
                    onAction={() =>
                      metadata &&
                      push(
                        <LibraryForm
                          libraries={libraries}
                          metadata={metadata}
                          onSave={(updatedLibs) => {
                            setLibraries(updatedLibs);
                            onRefresh?.();
                          }}
                        />,
                      )
                    }
                  />
                  <Action
                    title="Remove Library"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => deleteLibrary(lib.id)}
                    shortcut={
                      process.platform === "darwin"
                        ? { modifiers: ["cmd"], key: "x" }
                        : { modifiers: ["ctrl"], key: "x" }
                    }
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      <List.Section title="System Controls">
        <List.Item
          title="Add New Library"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action
                title="Add New Library"
                icon={Icon.Plus}
                onAction={() =>
                  metadata &&
                  push(
                    <LibraryForm
                      libraries={libraries}
                      metadata={metadata}
                      onSave={(updatedLibs) => {
                        setLibraries(updatedLibs);
                        onRefresh?.();
                      }}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Force Update Metadata"
          icon={Icon.Download}
          subtitle={
            lastUpdate
              ? `Last sync: ${new Date(lastUpdate).toLocaleString()}`
              : "Never updated"
          }
          actions={
            <ActionPanel>
              <Action
                title="Update Database Now"
                icon={Icon.Download}
                shortcut={
                  process.platform === "darwin"
                    ? { modifiers: ["cmd", "shift"], key: "u" }
                    : { modifiers: ["ctrl", "shift"], key: "u" }
                }
                onAction={() => loadData(true)}
              />
              <Action.OpenInBrowser
                title="View Source on GitHub"
                url="https://gist.github.com/Glct26/d94359cc11807aedcab0f08d19b65d9e"
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function LibraryForm({
  libraries,
  metadata,
  existingLibrary,
  onSave,
}: {
  libraries: Library[];
  metadata: Metadata;
  existingLibrary?: Library;
  onSave: (updatedLibs: Library[]) => void;
}) {
  const { pop } = useNavigation();
  const preferences = getPreferenceValues();

  const cleanRAPath =
    preferences.retroarchPath?.replace(/^"|"$/g, "").trim() ?? "";

  let defaultCoresDir = "";
  if (cleanRAPath) {
    defaultCoresDir = path.join(path.dirname(cleanRAPath), "cores");
    if (
      process.platform === "darwin" &&
      cleanRAPath.includes("RetroArch.app")
    ) {
      defaultCoresDir = path.join(
        path.dirname(path.dirname(cleanRAPath)),
        "Resources",
        "cores",
      );
    }
  }

  if (process.platform === "linux") {
    const home = process.env.HOME || "";
    const linuxConfig = path.join(home, ".config", "retroarch", "cores");
    if (fs.existsSync(linuxConfig)) {
      defaultCoresDir = linuxConfig;
    } else if (fs.existsSync("/usr/lib/libretro")) {
      defaultCoresDir = "/usr/lib/libretro";
    }
  }

  const coresDir = preferences.coresPath
    ? preferences.coresPath.replace(/^"|"$/g, "").trim()
    : defaultCoresDir;

  // Read directory contents once to prevent UI blocking during render
  const availableCoresSet = useMemo(() => {
    try {
      if (!fs.existsSync(coresDir)) return new Set<string>();
      return new Set(fs.readdirSync(coresDir));
    } catch {
      return new Set<string>();
    }
  }, [coresDir]);

  // Read MAME path once
  const hasMameGlobal = useMemo(() => {
    return !!(preferences.mamePath && fs.existsSync(preferences.mamePath));
  }, [preferences.mamePath]);

  const availableSystems = Object.entries(metadata.systems)
    .filter(([key, sys]) => {
      const hasRetroArchCore =
        !!preferences.retroarchPath &&
        getInstalledCores(sys.cores, availableCoresSet).length > 0;

      let hasStandalone = false;

      if (key === PLATFORMS.ARCADE || key === "MAME") {
        hasStandalone = hasMameGlobal;
      } else if (key === "PS1" && preferences.duckstationPath) {
        hasStandalone = true;
      } else if (
        (key === "GAMECUBE" || key === "WII") &&
        preferences.dolphinPath
      ) {
        hasStandalone = true;
      } else if (key === "PS2" && preferences.pcsx2Path) {
        hasStandalone = true;
      } else if (key === "PSP" && preferences.ppssppPath) {
        hasStandalone = true;
      } else if (process.platform === "darwin" && preferences.openEmuPath) {
        hasStandalone = true;
      }

      return hasRetroArchCore || hasStandalone;
    })
    .sort(([, a], [, b]) => a.name.localeCompare(b.name));

  const [selectedConsole, setSelectedConsole] = useState<string>(
    existingLibrary?.console || availableSystems[0]?.[0] || "",
  );
  const sys = metadata.systems[selectedConsole];
  const installedCores = sys
    ? getInstalledCores(sys.cores, availableCoresSet)
    : [];
  const [selectedCore, setSelectedCore] = useState<string>(
    existingLibrary?.core || "",
  );

  useEffect(() => {
    if (!existingLibrary) {
      const defaultCore =
        installedCores[0] ||
        ((selectedConsole === "ARCADE" || selectedConsole === "MAME") &&
        preferences.mamePath
          ? "mame_executable"
          : "");
      setSelectedCore(defaultCore);
    }
    // removed installedCores from the dependency array to prevent the selection reset loop
  }, [selectedConsole]);

  async function handleSubmit(values: {
    folder: string[];
    console: string;
    core: string;
  }) {
    const folderPath = values.folder[0];

    if (!folderPath || !fs.existsSync(folderPath)) {
      showToast({ title: "Invalid Path", style: Toast.Style.Failure });
      return;
    }

    const updatedLib: Library = {
      id: existingLibrary?.id || Date.now().toString(),
      path: folderPath,
      console: selectedConsole,
      core: selectedCore,
    };

    showToast({ title: "Checking for ROMs...", style: Toast.Style.Animated });
    const testGames = await scanLibraries([updatedLib], metadata);

    if (testGames.length === 0) {
      showToast({
        title: "No ROMs Found",
        message:
          "No valid ROMs for the selected system found in this folder. Cancelled.",
        style: Toast.Style.Failure,
      });
      return;
    }

    let updated: Library[];
    if (existingLibrary) {
      updated = libraries.map((l) =>
        l.id === existingLibrary.id ? updatedLib : l,
      );
    } else {
      const normalizedFolderPath = path.normalize(folderPath).toLowerCase();
      if (
        libraries.some(
          (l) => path.normalize(l.path).toLowerCase() === normalizedFolderPath,
        )
      ) {
        showToast({
          title: "Duplicate Library",
          message: "This folder is already added.",
          style: Toast.Style.Failure,
        });
        return;
      }
      updated = [...libraries, updatedLib];
    }

    await LocalStorage.setItem("libraries", JSON.stringify(updated));

    showToast({ title: "Updating cache...", style: Toast.Style.Animated });
    const cachePath = path.join(environment.supportPath, "gamesCache.json");
    let currentCache: Game[] = [];
    try {
      if (fs.existsSync(cachePath)) {
        const cacheRaw = await fs.promises.readFile(cachePath, "utf8");
        currentCache = JSON.parse(cacheRaw);
      }
    } catch (e) {
      /* ignore */
    }

    const newCache = [
      ...currentCache.filter((g) => g.libraryId !== updatedLib.id),
      ...testGames,
    ];
    await fs.promises.writeFile(cachePath, JSON.stringify(newCache), "utf8");

    showToast({
      title: existingLibrary ? "Library Updated" : "Library Added",
      style: Toast.Style.Success,
    });
    onSave(updated);
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={existingLibrary ? "Update Library" : "Save Library"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Folder Path"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        defaultValue={existingLibrary ? [existingLibrary.path] : undefined}
      />
      <Form.Dropdown
        id="console"
        title="System"
        value={selectedConsole}
        onChange={setSelectedConsole}
      >
        {availableSystems.map(([key, sys]) => (
          <Form.Dropdown.Item key={key} value={key} title={sys.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="core"
        title="Emulator Core"
        value={selectedCore}
        onChange={setSelectedCore}
      >
        {installedCores.map((core) => (
          <Form.Dropdown.Item key={core} value={core} title={core} />
        ))}
        {(selectedConsole === "ARCADE" || selectedConsole === "MAME") &&
          preferences.mamePath && (
            <Form.Dropdown.Item
              value="mame_executable"
              title="Standalone MAME (.exe)"
            />
          )}
        {process.platform === "darwin" && preferences.openEmuPath && (
          <Form.Dropdown.Item value="openemu" title="OpenEmu (Standalone)" />
        )}
        {selectedConsole === "PS1" && preferences.duckstationPath && (
          <Form.Dropdown.Item
            value="duckstation"
            title="DuckStation (Standalone)"
          />
        )}
        {(selectedConsole === "GAMECUBE" || selectedConsole === "WII") &&
          preferences.dolphinPath && (
            <Form.Dropdown.Item value="dolphin" title="Dolphin (Standalone)" />
          )}
        {selectedConsole === "PS2" && preferences.pcsx2Path && (
          <Form.Dropdown.Item value="pcsx2" title="PCSX2 (Standalone)" />
        )}
        {selectedConsole === "PSP" && preferences.ppssppPath && (
          <Form.Dropdown.Item value="ppsspp" title="PPSSPP (Standalone)" />
        )}
      </Form.Dropdown>
    </Form>
  );
}
