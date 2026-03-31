import {
  ActionPanel,
  Action,
  Form,
  List,
  Icon,
  showToast,
  Toast,
  useNavigation,
  confirmAlert,
  Color,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { readdir, stat, mkdir, rename as fsRename } from "fs/promises";
import { join, extname } from "path";
import { parseEpisode, assignSeasons, type ParsedEpisode } from "./episode-parser";
import {
  hasTvdbKey,
  searchShow as tvdbSearch,
  buildEpisodeMap as tvdbBuildMap,
  type ShowInfo as TvdbShowInfo,
} from "./tvdb";
import {
  hasTmdbKey,
  searchShow as tmdbSearch,
  buildEpisodeMap as tmdbBuildMap,
  type ShowInfo as TmdbShowInfo,
} from "./tmdb";
import { getFinderFolder } from "./finder";
import { analyzeFolder } from "./file-analyzer";
import { saveUndoState } from "./instant-runner";

type ShowInfo = TvdbShowInfo | TmdbShowInfo;
type MetadataSource = "none" | "tmdb" | "tvdb";

function isHidden(name: string): boolean {
  return name.startsWith(".");
}

interface OrganizedFile {
  original: string;
  season: number;
  episodeInSeason: number;
  newName: string;
  folder: string;
}

function padNumber(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

function PreviewList({ folderPath, files }: { folderPath: string; files: OrganizedFile[] }) {
  const seasons = [...new Set(files.map((f) => f.season))].sort((a, b) => a - b);

  async function doOrganize() {
    const confirmed = await confirmAlert({
      title: `Rename and sort ${files.length} files into ${seasons.length} season folders?`,
      message: "You can undo this with the 'Undo Last Rename' command.",
      primaryAction: { title: "Organize" },
    });
    if (!confirmed) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Organizing..." });

      const changes: { original: string; renamed: string }[] = [];
      for (const f of files) {
        const targetDir = join(folderPath, f.folder);
        await mkdir(targetDir, { recursive: true });
        await fsRename(join(folderPath, f.original), join(targetDir, f.newName));
        // Store relative paths for undo: original was in root, now in subfolder
        changes.push({ original: f.original, renamed: join(f.folder, f.newName) });
      }

      await saveUndoState({
        folderPath,
        changes,
        actionName: "Smart Organize Episodes",
        timestamp: Date.now(),
      });

      await showToast({ style: Toast.Style.Success, title: "Done!", message: `${files.length} episodes organized` });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List navigationTitle="Episode Preview">
      {seasons.map((s) => {
        const seasonFiles = files.filter((f) => f.season === s);
        return (
          <List.Section key={s} title={`Season ${padNumber(s, 2)}`} subtitle={`${seasonFiles.length} episodes`}>
            {seasonFiles.map((f, i) => (
              <List.Item
                key={i}
                icon={{ source: Icon.ArrowRight, tintColor: Color.Blue }}
                title={f.original}
                subtitle={`→ ${f.folder}/${f.newName}`}
                actions={
                  <ActionPanel>
                    <Action title="Organize All" icon={Icon.Checkmark} onAction={doOrganize} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

export default function SmartOrganize() {
  const { push } = useNavigation();
  const tmdbAvailable = hasTmdbKey();
  const tvdbAvailable = hasTvdbKey();
  const anySourceAvailable = tmdbAvailable || tvdbAvailable;

  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [suggestionNote, setSuggestionNote] = useState("");
  const [showName, setShowName] = useState("");
  const [metadataSource, setMetadataSource] = useState<MetadataSource>("none");
  const [seasons, setSeasons] = useState<{ episodes: string }[]>([{ episodes: "12" }]);
  const [startAtZero, setStartAtZero] = useState(false);
  const [folderTemplate, setFolderTemplate] = useState("Season {season}");
  const [fileTemplate, setFileTemplate] = useState("{show}.S{season}E{episode}");

  // Search state (shared by TMDB/TVDB)
  const [searchResults, setSearchResults] = useState<ShowInfo[]>([]);
  const [selectedShowId, setSelectedShowId] = useState<string>("");
  const [searching, setSearching] = useState(false);

  // Auto-detect Finder folder on launch
  useEffect(() => {
    (async () => {
      const folder = await getFinderFolder();
      if (folder) {
        setFolderPath(folder);
        await runAnalysis(folder);
      }
    })();
  }, []);

  async function runAnalysis(folder: string) {
    try {
      const a = await analyzeFolder(folder);
      const notes: string[] = [];

      if (a.detectedShowName) {
        setShowName(a.detectedShowName);
        notes.push(`Show name: "${a.detectedShowName}"`);
      }
      if (a.estimatedEpisodesPerSeason) {
        setSeasons([{ episodes: String(a.estimatedEpisodesPerSeason) }]);
        notes.push(`~${a.estimatedEpisodesPerSeason} eps/season detected`);
      }
      if (a.detectedSeasons.length > 0) {
        notes.push(`Seasons: ${a.detectedSeasons.join(", ")}`);
      }
      notes.push(`${a.detectedEpisodeCount}/${a.totalFiles} episodes detected`);

      setSuggestionNote(notes.join(" · "));
    } catch {
      // analysis failed, not critical
    }
  }

  async function onFolderChange(paths: string[]) {
    if (paths.length > 0 && paths[0] !== folderPath) {
      setFolderPath(paths[0]);
      await runAnalysis(paths[0]);
    }
  }

  useEffect(() => {
    if (metadataSource === "none" || showName.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const searchFn = metadataSource === "tmdb" ? tmdbSearch : tvdbSearch;
        const results = await searchFn(showName);
        setSearchResults(results);
        if (results.length > 0 && !selectedShowId) {
          setSelectedShowId(String(results[0].id));
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: error instanceof Error ? error.message : String(error),
        });
      }
      setSearching(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [showName, metadataSource]);

  async function handleSubmit(values: { folder: string[] }) {
    const folder = values.folder?.[0] || folderPath;
    if (!folder) {
      await showToast({ style: Toast.Style.Failure, title: "No folder selected" });
      return;
    }

    if (!showName.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Show name is required" });
      return;
    }

    try {
      await showToast({ style: Toast.Style.Animated, title: "Scanning files..." });

      // Read files
      const entries = await readdir(folder);
      const files: string[] = [];
      for (const entry of entries) {
        if (isHidden(entry)) continue;
        const s = await stat(join(folder, entry));
        if (s.isFile()) files.push(entry);
      }

      if (files.length === 0) {
        await showToast({ style: Toast.Style.Failure, title: "No files found" });
        return;
      }

      // Parse episodes
      const parsed: ParsedEpisode[] = [];
      const unparsed: string[] = [];
      for (const f of files) {
        const result = parseEpisode(f);
        if (result) {
          parsed.push(result);
        } else {
          unparsed.push(f);
        }
      }

      if (parsed.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No episode numbers detected",
          message: "Could not find episode numbers in any filenames.",
        });
        return;
      }

      // Determine season/episode mapping
      let episodeMap: Map<number, { season: number; episode: number; name?: string }>;

      if (metadataSource !== "none" && !selectedShowId) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No show selected",
          message: "Wait for search results to load, then select a show from the dropdown.",
        });
        return;
      }

      if (metadataSource !== "none" && selectedShowId) {
        // Use TMDB or TVDB data
        const sourceName = metadataSource === "tmdb" ? "TMDB" : "TheTVDB";
        const buildFn = metadataSource === "tmdb" ? tmdbBuildMap : tvdbBuildMap;
        try {
          await showToast({ style: Toast.Style.Animated, title: `Fetching episode data from ${sourceName}...` });
          const remoteMap = await buildFn(parseInt(selectedShowId));
          episodeMap = new Map();
          for (const [absEp, info] of remoteMap) {
            episodeMap.set(absEp, { season: info.season, episode: info.episode, name: info.name });
          }
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: `${sourceName} fetch failed, falling back to manual split`,
            message: error instanceof Error ? error.message : String(error),
          });
          // Fallback to manual season breakdown
          const epNumbers = parsed.map((p) => p.episodeNumber);
          const counts = seasons.map((s) => parseInt(s.episodes) || 12);
          const seasonMap = assignSeasons(epNumbers, counts);
          episodeMap = new Map();
          for (const [ep, info] of seasonMap) {
            episodeMap.set(ep, { season: info.season, episode: info.episodeInSeason });
          }
        }
      } else {
        // Manual mode — use season breakdown or existing filename info
        const hasSeasons = parsed.some((p) => p.seasonNumber !== null);

        if (hasSeasons) {
          episodeMap = new Map();
          for (const p of parsed) {
            episodeMap.set(p.episodeNumber, {
              season: p.seasonNumber ?? 1,
              episode: p.episodeNumber,
            });
          }
        } else {
          const epNumbers = parsed.map((p) => p.episodeNumber);
          const counts = seasons.map((s) => parseInt(s.episodes) || 12);
          const seasonMap = assignSeasons(epNumbers, counts);
          episodeMap = new Map();
          for (const [ep, info] of seasonMap) {
            episodeMap.set(ep, { season: info.season, episode: info.episodeInSeason });
          }
        }
      }

      // Build organized file list
      const show = showName.trim().replace(/\s+/g, ".");
      const seasonOffset = startAtZero ? -1 : 0;
      const organized: OrganizedFile[] = [];

      for (const p of parsed) {
        const mapping = episodeMap.get(p.episodeNumber);
        if (!mapping) continue;

        const ext = extname(p.fileName);
        const displaySeason = mapping.season + seasonOffset;

        const targetFolder = folderTemplate.replace("{season}", padNumber(displaySeason, 2)).replace("{show}", show);

        const newName =
          fileTemplate
            .replace("{show}", show)
            .replace("{season}", padNumber(displaySeason, 2))
            .replace("{episode}", padNumber(mapping.episode, 2)) + ext;

        organized.push({
          original: p.fileName,
          season: displaySeason,
          episodeInSeason: mapping.episode,
          newName,
          folder: targetFolder,
        });
      }

      organized.sort((a, b) => a.season - b.season || a.episodeInSeason - b.episodeInSeason);

      if (unparsed.length > 0) {
        await showToast({
          style: Toast.Style.Success,
          title: `${parsed.length} episodes detected`,
          message: `${unparsed.length} files could not be parsed and will be skipped.`,
        });
      }

      push(<PreviewList folderPath={folder} files={organized} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Scan and Preview" icon={Icon.Eye} onSubmit={handleSubmit} />
          {metadataSource === "none" && (
            <Action
              title="Add Season"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={() => setSeasons([...seasons, { episodes: "12" }])}
            />
          )}
          {metadataSource === "none" && seasons.length > 1 && (
            <Action
              title="Remove Last Season"
              icon={Icon.Minus}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={() => setSeasons(seasons.slice(0, -1))}
            />
          )}
        </ActionPanel>
      }
    >
      {suggestionNote && <Form.Description title="Smart Detection" text={suggestionNote} />}

      <Form.FilePicker
        id="folder"
        title="Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        defaultValue={folderPath ? [folderPath] : undefined}
        onChange={onFolderChange}
        info={
          folderPath ? `Auto-detected from Finder: ${folderPath}` : "Open a Finder window or select a folder manually"
        }
      />

      <Form.TextField
        id="showName"
        title="Show / Anime Name"
        placeholder="Jujutsu Kaisen"
        value={showName}
        onChange={setShowName}
      />

      <Form.Separator />

      {anySourceAvailable && (
        <Form.Dropdown
          id="metadataSource"
          title="Metadata Source"
          value={metadataSource}
          onChange={(v) => {
            setMetadataSource(v as MetadataSource);
            setSearchResults([]);
            setSelectedShowId("");
          }}
        >
          <Form.Dropdown.Item value="none" title="Manual (set episodes per season)" />
          {tmdbAvailable && <Form.Dropdown.Item value="tmdb" title="TMDB (free)" />}
          {tvdbAvailable && <Form.Dropdown.Item value="tvdb" title="TheTVDB (subscription)" />}
        </Form.Dropdown>
      )}

      {metadataSource !== "none" && searchResults.length > 0 && (
        <Form.Dropdown
          id="showMatch"
          title={metadataSource === "tmdb" ? "TMDB Match" : "TVDB Match"}
          value={selectedShowId}
          onChange={setSelectedShowId}
          isLoading={searching}
        >
          {searchResults.map((r) => (
            <Form.Dropdown.Item
              key={r.id}
              value={String(r.id)}
              title={`${r.name}${r.firstAirDate ? ` (${r.firstAirDate.slice(0, 4)})` : ""}`}
            />
          ))}
        </Form.Dropdown>
      )}

      {metadataSource === "none" && (
        <>
          {seasons.map((s, i) => (
            <Form.TextField
              key={`season-${i}`}
              id={`season-${i}`}
              title={`Season ${i + (startAtZero ? 0 : 1)} Episodes`}
              placeholder="12"
              value={s.episodes}
              onChange={(val) => {
                const updated = [...seasons];
                updated[i] = { episodes: val };
                setSeasons(updated);
              }}
            />
          ))}
          <Form.Description
            title=""
            text={`${seasons.length} season${seasons.length === 1 ? "" : "s"} configured (${seasons.map((s) => s.episodes || "?").join(", ")} episodes). Press Cmd+N to add a season, Cmd+Delete to remove.`}
          />
        </>
      )}

      <Form.Separator />

      <Form.TextField
        id="folderTemplate"
        title="Folder Template"
        placeholder="Season {season}"
        value={folderTemplate}
        onChange={setFolderTemplate}
        info="Variables: {show}, {season}"
      />

      <Form.TextField
        id="fileTemplate"
        title="File Template"
        placeholder="{show}.S{season}E{episode}"
        value={fileTemplate}
        onChange={setFileTemplate}
        info="Variables: {show}, {season}, {episode}. Extension is added automatically."
      />

      <Form.Separator />

      <Form.Checkbox
        id="startAtZero"
        label="Start season numbering at 00"
        value={startAtZero}
        onChange={setStartAtZero}
        info="When enabled, the first season is numbered 00 instead of 01. Useful for shows with a Season 0 or pilot season."
      />

      <Form.Description
        title="How It Works"
        text={`Scans filenames for episode numbers (supports S01E01, 001, EP01, anime formats, etc.), ${anySourceAvailable ? "optionally fetches season data from TMDB or TheTVDB, " : ""}then renames and sorts files into season folders.\n\nFiles that can't be parsed are left untouched.`}
      />

      {!anySourceAvailable && (
        <Form.Description
          title="Metadata Integration"
          text="Add a TMDB API key (free at themoviedb.org) or a TheTVDB API key ($12/year at thetvdb.com) in extension preferences to enable automatic season/episode lookup."
        />
      )}
    </Form>
  );
}
