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
import { readdir, rename, stat } from "fs/promises";
import { join } from "path";
import { type RenameMode, type RenameOptions, type RenamePreview, generatePreviews } from "./rename";
import { getFinderFolder } from "./finder";
import { saveUndoState } from "./instant-runner";
import { analyzeFolder, type FileAnalysis } from "./file-analyzer";

function isHidden(fileName: string): boolean {
  return fileName.startsWith(".");
}

async function getFiles(folderPath: string): Promise<string[]> {
  const entries = await readdir(folderPath);
  const files: string[] = [];
  for (const entry of entries) {
    if (isHidden(entry)) continue;
    const fullPath = join(folderPath, entry);
    const s = await stat(fullPath);
    if (s.isFile()) files.push(entry);
  }
  return files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
}

function PreviewList({ folderPath, previews }: { folderPath: string; previews: RenamePreview[] }) {
  const hasChanges = previews.some((p) => p.original !== p.renamed);

  async function doRename() {
    const confirmed = await confirmAlert({
      title: `Rename ${previews.length} files?`,
      message: "You can undo this with the 'Undo Last Rename' command.",
      primaryAction: { title: "Rename" },
    });
    if (!confirmed) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Renaming files..." });
      const changes: { original: string; renamed: string }[] = [];
      for (const p of previews) {
        if (p.original === p.renamed) continue;
        await rename(join(folderPath, p.original), join(folderPath, p.renamed));
        changes.push({ original: p.original, renamed: p.renamed });
      }
      await saveUndoState({ folderPath, changes, actionName: "Rename Files", timestamp: Date.now() });
      await showToast({ style: Toast.Style.Success, title: "Done!", message: `Renamed ${changes.length} files` });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Rename failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List navigationTitle="Preview Renames">
      {previews.map((p, i) => {
        const changed = p.original !== p.renamed;
        return (
          <List.Item
            key={i}
            icon={{
              source: changed ? Icon.ArrowRight : Icon.Minus,
              tintColor: changed ? Color.Blue : Color.SecondaryText,
            }}
            title={p.original}
            subtitle={changed ? `→ ${p.renamed}` : "(unchanged)"}
            actions={
              <ActionPanel>
                {hasChanges && <Action title="Confirm Rename All" icon={Icon.Checkmark} onAction={doRename} />}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default function Rebaptize({ initialMode }: { initialMode?: RenameMode } = {}) {
  const { push } = useNavigation();

  const lockedMode = initialMode !== undefined;
  const [folderPath, setFolderPath] = useState<string | null>(null);

  const [mode, setMode] = useState<RenameMode>(initialMode ?? "sequential");
  const [suggestionNote, setSuggestionNote] = useState("");

  // Word delimiter (shared by TV show & Movie)
  const [wordDelimiter, setWordDelimiter] = useState(" ");
  const [customDelimiter, setCustomDelimiter] = useState("");
  const [suffix, setSuffix] = useState("");

  // TV show
  const [showName, setShowName] = useState("");
  const [overrideSeason, setOverrideSeason] = useState(false);
  const [season, setSeason] = useState("1");
  const [startEpisode, setStartEpisode] = useState("1");

  // Anime
  const [animeName, setAnimeName] = useState("");
  const animeSeason = "1";
  const [startAnimeEpisode, setStartAnimeEpisode] = useState("1");
  const [group, setGroup] = useState("");
  const [quality, setQuality] = useState("");

  // Movie
  const [movieName, setMovieName] = useState("");
  const [year, setYear] = useState("");
  const [movieQuality, setMovieQuality] = useState("");

  // Sequential
  const [prefix, setPrefix] = useState("");
  const [startNumber, setStartNumber] = useState("1");
  const [zeroPad, setZeroPad] = useState("3");
  const [separator, setSeparator] = useState("-");

  // Date
  const [dateFormat, setDateFormat] = useState<"YYYY-MM-DD" | "DD-MM-YYYY" | "MM-DD-YYYY">("YYYY-MM-DD");
  const [datePrefix, setDatePrefix] = useState("");

  // Change extension
  const [fromExtension, setFromExtension] = useState("");
  const [toExtension, setToExtension] = useState("");

  // Change case
  const [caseType, setCaseType] = useState<"uppercase" | "lowercase" | "titlecase" | "sentencecase">("titlecase");
  const [fixSpaces, setFixSpaces] = useState(true);

  // Swap delimiter
  const [fromDelimiter, setFromDelimiter] = useState(".");
  const [toDelimiter, setToDelimiter] = useState(" ");

  // Enumerate
  const [enumPrefix, setEnumPrefix] = useState("");
  const [enumStart, setEnumStart] = useState("1");
  const [enumPad, setEnumPad] = useState("3");
  const [enumSeparator, setEnumSeparator] = useState("-");
  const [enumSortBy, setEnumSortBy] = useState<"name" | "created" | "modified" | "size" | "name-length">("name");

  // Find & Replace
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [useRegex, setUseRegex] = useState(false);

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
      const result = await analyzeFolder(folder);
      applySmartDefaults(result);
    } catch {
      // Analysis failed, continue with defaults
    }
  }

  function applySmartDefaults(a: FileAnalysis) {
    const notes: string[] = [];

    // Set suggested mode (only if not locked to a specific preset)
    if (!lockedMode && a.suggestedMode !== "unknown") {
      setMode(a.suggestedMode);
      const confidence = Math.round(a.confidence * 100);
      notes.push(`Detected ${a.suggestedMode.replace("-", " ")} pattern (${confidence}% confidence)`);
    }

    // Auto-fill based on mode
    const name = a.detectedShowName || "";

    switch (a.suggestedMode) {
      case "tv-show":
        setShowName(name);
        if (a.detectedSeasons.length === 1) {
          setSeason(String(a.detectedSeasons[0]));
        }
        if (name) notes.push(`Show name: "${name}"`);
        if (a.detectedSeasons.length > 1) {
          notes.push(
            `${a.detectedSeasons.length} seasons detected (${a.detectedSeasons.join(", ")}) — use Smart Organize Episodes for multi-season sorting`,
          );
        } else if (a.detectedSeasons.length === 1) {
          notes.push(`Season ${a.detectedSeasons[0]}`);
        }
        break;
      case "anime":
        setAnimeName(name);
        if (name) notes.push(`Anime name: "${name}"`);
        break;
      case "movie":
        setMovieName(name);
        if (name) notes.push(`Movie name: "${name}"`);
        break;
      case "sequential":
        if (name) {
          setPrefix(name.replace(/\s+/g, "-"));
          notes.push(`Prefix: "${name.replace(/\s+/g, "-")}"`);
        }
        break;
      default:
        break;
    }

    notes.push(`${a.totalFiles} files in folder`);
    if (a.detectedEpisodeCount > 0) {
      notes.push(`${a.detectedEpisodeCount} episodes detected`);
    }

    setSuggestionNote(notes.join(" · "));
  }

  // Re-analyze when folder changes via picker
  async function onFolderChange(paths: string[]) {
    if (paths.length > 0 && paths[0] !== folderPath) {
      setFolderPath(paths[0]);
      await runAnalysis(paths[0]);
    }
  }

  function effectiveDelimiter(): string {
    return wordDelimiter === "custom" ? customDelimiter : wordDelimiter;
  }

  async function handleSubmit(values: { folder: string[] }) {
    const folder = values.folder?.[0] || folderPath;
    if (!folder) {
      await showToast({ style: Toast.Style.Failure, title: "No folder selected" });
      return;
    }

    try {
      let files = await getFiles(folder);
      if (files.length === 0) {
        await showToast({ style: Toast.Style.Failure, title: "No files found" });
        return;
      }

      const options: RenameOptions = { mode };

      switch (mode) {
        case "tv-show":
          if (!showName.trim()) {
            await showToast({ style: Toast.Style.Failure, title: "Show name is required" });
            return;
          }
          options.showName = showName.trim();
          options.overrideSeason = overrideSeason;
          options.season = parseInt(season) || 1;
          options.startEpisode = parseInt(startEpisode) || 1;
          options.wordDelimiter = effectiveDelimiter();
          options.suffix = suffix.trim();
          break;
        case "anime":
          if (!animeName.trim()) {
            await showToast({ style: Toast.Style.Failure, title: "Anime name is required" });
            return;
          }
          options.animeName = animeName.trim();
          options.animeSeason = parseInt(animeSeason) || 1;
          options.startAnimeEpisode = parseInt(startAnimeEpisode) || 1;
          options.group = group.trim();
          options.quality = quality.trim();
          break;
        case "movie":
          if (!movieName.trim()) {
            await showToast({ style: Toast.Style.Failure, title: "Movie name is required" });
            return;
          }
          options.movieName = movieName.trim();
          options.year = year.trim();
          options.movieQuality = movieQuality.trim();
          options.wordDelimiter = effectiveDelimiter();
          break;
        case "sequential":
          if (!prefix.trim()) {
            await showToast({ style: Toast.Style.Failure, title: "Prefix is required" });
            return;
          }
          options.prefix = prefix.trim();
          options.startNumber = parseInt(startNumber) || 1;
          options.zeroPad = parseInt(zeroPad) || 3;
          options.separator = separator;
          break;
        case "date":
          options.dateFormat = dateFormat;
          options.datePrefix = datePrefix.trim();
          break;
        case "find-replace":
          if (!find) {
            await showToast({ style: Toast.Style.Failure, title: "Find pattern is required" });
            return;
          }
          options.find = find;
          options.replace = replace;
          options.useRegex = useRegex;
          break;
        case "change-extension":
          if (!toExtension.trim()) {
            await showToast({ style: Toast.Style.Failure, title: "New extension is required" });
            return;
          }
          options.fromExtension = fromExtension.trim();
          options.toExtension = toExtension.trim();
          break;
        case "change-case":
          options.caseType = caseType;
          options.fixSpaces = fixSpaces;
          break;
        case "swap-delimiter":
          if (!fromDelimiter) {
            await showToast({ style: Toast.Style.Failure, title: "From delimiter is required" });
            return;
          }
          options.fromDelimiter = fromDelimiter;
          options.toDelimiter = toDelimiter;
          break;
        case "enumerate":
          options.enumPrefix = enumPrefix.trim();
          options.enumStart = parseInt(enumStart) || 1;
          options.enumPad = parseInt(enumPad) || 3;
          options.enumSeparator = enumSeparator;
          options.enumSortBy = enumSortBy;
          // Sort files before generating previews
          if (enumSortBy !== "name") {
            const fileStats = await Promise.all(
              files.map(async (f) => {
                const s = await stat(join(folder, f));
                return { name: f, stat: s };
              }),
            );
            switch (enumSortBy) {
              case "created":
                fileStats.sort(
                  (a, b) =>
                    (a.stat.birthtime.getTime() > 0 ? a.stat.birthtime.getTime() : a.stat.mtime.getTime()) -
                    (b.stat.birthtime.getTime() > 0 ? b.stat.birthtime.getTime() : b.stat.mtime.getTime()),
                );
                break;
              case "modified":
                fileStats.sort((a, b) => a.stat.mtime.getTime() - b.stat.mtime.getTime());
                break;
              case "size":
                fileStats.sort((a, b) => a.stat.size - b.stat.size);
                break;
              case "name-length":
                fileStats.sort((a, b) => a.name.length - b.name.length);
                break;
            }
            files = fileStats.map((f) => f.name);
          }
          break;
      }

      const previews = await generatePreviews(folder, files, options);
      push(<PreviewList folderPath={folder} previews={previews} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error reading folder",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Live preview helpers
  function tvPreview(): string {
    const d = effectiveDelimiter() || " ";
    const name = (showName.trim() || "Show Name").replace(/\s+/g, d);
    const sfx = suffix.trim() ? `${d}${suffix.trim()}` : "";
    return `${name}${d}S${(season || "1").padStart(2, "0")}E${(startEpisode || "1").padStart(2, "0")}${sfx}.ext`;
  }

  function animePreview(): string {
    const g = group.trim() ? `[${group.trim()}] ` : "";
    const q = quality.trim() ? ` [${quality.trim()}]` : "";
    return `${g}${animeName.trim() || "Anime Name"} - ${(startAnimeEpisode || "1").padStart(2, "0")}${q}.ext`;
  }

  function moviePreview(): string {
    const d = effectiveDelimiter() || " ";
    const parts = [(movieName.trim() || "Movie Name").replace(/\s+/g, d)];
    if (year.trim()) parts.push(year.trim());
    if (movieQuality.trim()) parts.push(movieQuality.trim());
    return parts.join(d) + ".ext";
  }

  function seqPreview(): string {
    const p = prefix.trim() || "file";
    const s = separator || "-";
    const n = (startNumber || "1").padStart(parseInt(zeroPad) || 3, "0");
    return `${p}${s}${n}.ext`;
  }

  function datePreview(): string {
    const p = datePrefix.trim() ? `${datePrefix.trim()}-` : "";
    return `${p}2026-03-30_14-30-00-001.ext`;
  }

  function frPreview(): string {
    const sample = "My.Example.File.Name.ext";
    if (!find) return sample;
    const nameWithoutExt = "My.Example.File.Name";
    let result: string;
    if (useRegex) {
      try {
        result = nameWithoutExt.replace(new RegExp(find, "g"), replace);
      } catch {
        result = nameWithoutExt;
      }
    } else {
      result = nameWithoutExt.split(find).join(replace);
    }
    return `${result}.ext`;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Preview Renames" icon={Icon.Eye} onSubmit={handleSubmit} />
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

      <Form.Dropdown id="mode" title="Preset" value={mode} onChange={(v) => setMode(v as RenameMode)}>
        <Form.Dropdown.Item value="tv-show" title="TV Show (S01E01)" icon={Icon.Monitor} />
        <Form.Dropdown.Item value="anime" title="Anime ([Group] Name - 01)" icon={Icon.Stars} />
        <Form.Dropdown.Item value="movie" title="Movie (Name.Year.Quality)" icon={Icon.FilmStrip} />
        <Form.Dropdown.Item value="sequential" title="Sequential (Prefix-001)" icon={Icon.NumberList} />
        <Form.Dropdown.Item value="date" title="Date-Based" icon={Icon.Calendar} />
        <Form.Dropdown.Item value="change-case" title="Change Case" icon={Icon.Text} />
        <Form.Dropdown.Item value="swap-delimiter" title="Swap Delimiter" icon={Icon.Switch} />
        <Form.Dropdown.Item value="enumerate" title="Auto Enumerate" icon={Icon.List} />
        <Form.Dropdown.Item value="change-extension" title="Change Extension" icon={Icon.Document} />
        <Form.Dropdown.Item value="find-replace" title="Find & Replace" icon={Icon.MagnifyingGlass} />
      </Form.Dropdown>

      <Form.Separator />

      {mode === "tv-show" && (
        <>
          <Form.TextField
            id="showName"
            title="Show Name"
            placeholder="Breaking Bad"
            value={showName}
            onChange={setShowName}
          />
          <Form.Checkbox
            id="overrideSeason"
            label="Override season/episode from filenames"
            value={overrideSeason}
            onChange={setOverrideSeason}
            info="Off: keeps existing S01E01 info from filenames. On: forces all files to the season and start episode below."
          />
          <Form.TextField
            id="season"
            title={overrideSeason ? "Season" : "Default Season"}
            placeholder="1"
            value={season}
            onChange={setSeason}
            info={
              overrideSeason
                ? "All files will use this season number"
                : "Only used for files without season info in their name (e.g. 001.mkv)"
            }
          />
          <Form.TextField
            id="startEpisode"
            title={overrideSeason ? "Start Episode" : "Default Start Episode"}
            placeholder="1"
            value={startEpisode}
            onChange={setStartEpisode}
            info={
              overrideSeason
                ? "First episode number, incrementing for each file"
                : "Only used for files without episode info in their name"
            }
          />
          <Form.Dropdown id="wordDelimiter" title="Word Separator" value={wordDelimiter} onChange={setWordDelimiter}>
            <Form.Dropdown.Item value=" " title="Space ( )" />
            <Form.Dropdown.Item value="." title="Dot (.)" />
            <Form.Dropdown.Item value="_" title="Underscore (_)" />
            <Form.Dropdown.Item value="-" title="Dash (-)" />
            <Form.Dropdown.Item value="custom" title="Custom..." />
          </Form.Dropdown>
          {wordDelimiter === "custom" && (
            <Form.TextField
              id="customDelimiter"
              title="Custom Separator"
              placeholder=" - "
              value={customDelimiter}
              onChange={setCustomDelimiter}
            />
          )}
          <Form.TextField
            id="suffix"
            title="Suffix (Optional)"
            placeholder="1080p PROPER"
            value={suffix}
            onChange={setSuffix}
            info="Added after S01E01. e.g. 1080p, PROPER, BluRay"
          />
          <Form.Description title="Preview" text={tvPreview()} />
        </>
      )}

      {mode === "anime" && (
        <>
          <Form.TextField
            id="animeName"
            title="Anime Name"
            placeholder="Jujutsu Kaisen"
            value={animeName}
            onChange={setAnimeName}
          />
          <Form.TextField
            id="startAnimeEpisode"
            title="Start Episode"
            placeholder="1"
            value={startAnimeEpisode}
            onChange={setStartAnimeEpisode}
          />
          <Form.TextField
            id="group"
            title="Sub Group (Optional)"
            placeholder="SubsPlease"
            value={group}
            onChange={setGroup}
          />
          <Form.TextField
            id="quality"
            title="Quality (Optional)"
            placeholder="1080p"
            value={quality}
            onChange={setQuality}
          />
          <Form.Description title="Preview" text={animePreview()} />
        </>
      )}

      {mode === "movie" && (
        <>
          <Form.TextField
            id="movieName"
            title="Movie Name"
            placeholder="Interstellar"
            value={movieName}
            onChange={setMovieName}
          />
          <Form.TextField id="year" title="Year (Optional)" placeholder="2014" value={year} onChange={setYear} />
          <Form.TextField
            id="movieQuality"
            title="Quality (Optional)"
            placeholder="1080p"
            value={movieQuality}
            onChange={setMovieQuality}
          />
          <Form.Dropdown
            id="wordDelimiterMovie"
            title="Word Separator"
            value={wordDelimiter}
            onChange={setWordDelimiter}
          >
            <Form.Dropdown.Item value=" " title="Space ( )" />
            <Form.Dropdown.Item value="." title="Dot (.)" />
            <Form.Dropdown.Item value="_" title="Underscore (_)" />
            <Form.Dropdown.Item value="-" title="Dash (-)" />
            <Form.Dropdown.Item value="custom" title="Custom..." />
          </Form.Dropdown>
          {wordDelimiter === "custom" && (
            <Form.TextField
              id="customDelimiterMovie"
              title="Custom Separator"
              placeholder=" - "
              value={customDelimiter}
              onChange={setCustomDelimiter}
            />
          )}
          <Form.Description title="Preview" text={moviePreview()} />
        </>
      )}

      {mode === "sequential" && (
        <>
          <Form.TextField id="prefix" title="Prefix" placeholder="Vacation" value={prefix} onChange={setPrefix} />
          <Form.TextField
            id="startNumber"
            title="Start Number"
            placeholder="1"
            value={startNumber}
            onChange={setStartNumber}
          />
          <Form.TextField id="zeroPad" title="Zero Padding" placeholder="3" value={zeroPad} onChange={setZeroPad} />
          <Form.Dropdown id="separator" title="Separator" value={separator} onChange={setSeparator}>
            <Form.Dropdown.Item value="-" title="Dash (-)" />
            <Form.Dropdown.Item value="_" title="Underscore (_)" />
            <Form.Dropdown.Item value="." title="Dot (.)" />
            <Form.Dropdown.Item value=" " title="Space" />
          </Form.Dropdown>
          <Form.Description title="Preview" text={seqPreview()} />
        </>
      )}

      {mode === "date" && (
        <>
          <Form.Dropdown
            id="dateFormat"
            title="Date Format"
            value={dateFormat}
            onChange={(v) => setDateFormat(v as "YYYY-MM-DD" | "DD-MM-YYYY" | "MM-DD-YYYY")}
          >
            <Form.Dropdown.Item value="YYYY-MM-DD" title="YYYY-MM-DD" />
            <Form.Dropdown.Item value="DD-MM-YYYY" title="DD-MM-YYYY" />
            <Form.Dropdown.Item value="MM-DD-YYYY" title="MM-DD-YYYY" />
          </Form.Dropdown>
          <Form.TextField
            id="datePrefix"
            title="Prefix (Optional)"
            placeholder="Trip"
            value={datePrefix}
            onChange={setDatePrefix}
          />
          <Form.Description title="Preview" text={datePreview()} />
        </>
      )}

      {mode === "change-case" && (
        <>
          <Form.Dropdown
            id="caseType"
            title="Case"
            value={caseType}
            onChange={(v) => setCaseType(v as typeof caseType)}
          >
            <Form.Dropdown.Item value="titlecase" title="Title Case" />
            <Form.Dropdown.Item value="uppercase" title="UPPERCASE" />
            <Form.Dropdown.Item value="lowercase" title="lowercase" />
            <Form.Dropdown.Item value="sentencecase" title="Sentence case" />
          </Form.Dropdown>
          <Form.Checkbox
            id="fixSpaces"
            label="Collapse multiple spaces into one"
            value={fixSpaces}
            onChange={setFixSpaces}
          />
          <Form.Description
            title="Preview"
            text={(() => {
              const sample = "my  show  name   S01E01";
              const fixed = fixSpaces ? sample.replace(/\s{2,}/g, " ").trim() : sample;
              switch (caseType) {
                case "uppercase":
                  return `${sample}\n→ ${fixed.toUpperCase()}`;
                case "lowercase":
                  return `${sample}\n→ ${fixed.toLowerCase()}`;
                case "titlecase":
                  return `${sample}\n→ ${fixed
                    .split(/(\s+)/)
                    .map((w) => (/^\s+$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
                    .join("")}`;
                case "sentencecase":
                  return `${sample}\n→ ${fixed.charAt(0).toUpperCase() + fixed.slice(1).toLowerCase()}`;
                default:
                  return sample;
              }
            })()}
          />
        </>
      )}

      {mode === "swap-delimiter" && (
        <>
          <Form.TextField
            id="fromDelimiter"
            title="From"
            placeholder="."
            value={fromDelimiter}
            onChange={setFromDelimiter}
            info="The character(s) to find and replace in filenames"
          />
          <Form.TextField
            id="toDelimiter"
            title="To"
            placeholder=" "
            value={toDelimiter}
            onChange={setToDelimiter}
            info="The replacement character(s)"
          />
          <Form.Description
            title="Preview"
            text={(() => {
              const sample =
                fromDelimiter === "." ? "My.Show.S01E01.720p" : `My${fromDelimiter}Show${fromDelimiter}S01E01`;
              const result = fromDelimiter ? sample.split(fromDelimiter).join(toDelimiter) : sample;
              return `${sample}.ext\n→ ${result}.ext`;
            })()}
          />
        </>
      )}

      {mode === "enumerate" && (
        <>
          <Form.TextField
            id="enumPrefix"
            title="Prefix (Optional)"
            placeholder="photo"
            value={enumPrefix}
            onChange={setEnumPrefix}
          />
          <Form.TextField
            id="enumStart"
            title="Start Number"
            placeholder="1"
            value={enumStart}
            onChange={setEnumStart}
          />
          <Form.TextField id="enumPad" title="Zero Padding" placeholder="3" value={enumPad} onChange={setEnumPad} />
          <Form.Dropdown id="enumSeparator" title="Separator" value={enumSeparator} onChange={setEnumSeparator}>
            <Form.Dropdown.Item value="-" title="Dash (-)" />
            <Form.Dropdown.Item value="_" title="Underscore (_)" />
            <Form.Dropdown.Item value="." title="Dot (.)" />
            <Form.Dropdown.Item value=" " title="Space" />
          </Form.Dropdown>
          <Form.Dropdown
            id="enumSortBy"
            title="Sort Files By"
            value={enumSortBy}
            onChange={(v) => setEnumSortBy(v as typeof enumSortBy)}
          >
            <Form.Dropdown.Item value="name" title="File Name (A-Z)" icon={Icon.Text} />
            <Form.Dropdown.Item value="created" title="Date Created (oldest first)" icon={Icon.Calendar} />
            <Form.Dropdown.Item value="modified" title="Date Modified (oldest first)" icon={Icon.Clock} />
            <Form.Dropdown.Item value="size" title="File Size (smallest first)" icon={Icon.HardDrive} />
            <Form.Dropdown.Item value="name-length" title="Name Length (shortest first)" icon={Icon.BarChart} />
          </Form.Dropdown>
          <Form.Description
            title="Preview"
            text={(() => {
              const p = enumPrefix.trim();
              const s = enumSeparator || "-";
              const n = (enumStart || "1").padStart(parseInt(enumPad) || 3, "0");
              return p ? `${p}${s}${n}.ext` : `${n}.ext`;
            })()}
          />
        </>
      )}

      {mode === "find-replace" && (
        <>
          <Form.TextField id="find" title="Find" placeholder="old-text" value={find} onChange={setFind} />
          <Form.TextField
            id="replace"
            title="Replace With"
            placeholder="new-text"
            value={replace}
            onChange={setReplace}
          />
          <Form.Checkbox id="useRegex" label="Use Regular Expression" value={useRegex} onChange={setUseRegex} />
          <Form.Description title="Preview" text={frPreview()} />
        </>
      )}

      {mode === "change-extension" && (
        <>
          <Form.TextField
            id="fromExtension"
            title="From Extension (Optional)"
            placeholder="jpeg"
            value={fromExtension}
            onChange={setFromExtension}
            info="Only change files with this extension. Leave empty to change all files."
          />
          <Form.TextField
            id="toExtension"
            title="New Extension"
            placeholder="jpg"
            value={toExtension}
            onChange={setToExtension}
          />
          <Form.Description
            title="Preview"
            text={
              fromExtension.trim()
                ? `*.${fromExtension.trim()} → *.${toExtension.trim() || "?"}`
                : `*.* → *.${toExtension.trim() || "?"}`
            }
          />
        </>
      )}
    </Form>
  );
}
