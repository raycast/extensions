import { ActionPanel, Action, Form, List, Icon, showToast, Toast, useNavigation, Color, showHUD } from "@raycast/api";
import { useState } from "react";
import { randomUUID } from "crypto";
import {
  type StepType,
  type ScriptStep,
  type RenameScript,
  saveScript,
  executeScript,
  stepLabel,
  stepTypeLabel,
} from "./scripts";
import { type EnumCounter, formatIndex } from "./rename";
import { getFinderFolder } from "./finder";
import { readdir, stat } from "fs/promises";
import { join } from "path";

// ─── Step Configuration Form ───

function StepForm({ onSubmit, existing }: { onSubmit: (step: ScriptStep) => void; existing?: ScriptStep }) {
  const { pop } = useNavigation();
  const isEdit = !!existing;
  const [stepType, setStepType] = useState<StepType>(existing?.type ?? "swap-delimiter");

  // Swap delimiter
  const [fromDel, setFromDel] = useState(existing?.fromDelimiter ?? ".");
  const [toDel, setToDel] = useState(existing?.toDelimiter ?? " ");
  // Find & Replace
  const [find, setFind] = useState(existing?.find ?? "");
  const [replace, setReplace] = useState(existing?.replace ?? "");
  const [useRegex, setUseRegex] = useState(existing?.useRegex ?? false);
  // Change extension
  const [fromExt, setFromExt] = useState(existing?.fromExtension ?? "");
  const [toExt, setToExt] = useState(existing?.toExtension ?? "");
  // TV Show
  const [showName, setShowName] = useState(existing?.showName ?? "");
  const [season, setSeason] = useState(String(existing?.season ?? 1));
  const [startEp, setStartEp] = useState(String(existing?.startEpisode ?? 1));
  const [wordDel, setWordDel] = useState(existing?.wordDelimiter ?? " ");
  const [suffix, setSuffix] = useState(existing?.suffix ?? "");
  // Anime
  const [animeName, setAnimeName] = useState(existing?.animeName ?? "");
  const [startAnimeEp, setStartAnimeEp] = useState(String(existing?.startAnimeEpisode ?? 1));
  const [group, setGroup] = useState(existing?.group ?? "");
  const [quality, setQuality] = useState(existing?.quality ?? "");
  // Movie
  const [movieName, setMovieName] = useState(existing?.movieName ?? "");
  const [year, setYear] = useState(existing?.year ?? "");
  const [movieQuality, setMovieQuality] = useState(existing?.movieQuality ?? "");
  // Sequential / Enumerate
  const [prefix, setPrefix] = useState(existing?.prefix ?? "");
  const [startNum, setStartNum] = useState(String(existing?.startNumber ?? 1));
  const [zeroPad, setZeroPad] = useState(String(existing?.zeroPad ?? 3));
  const [separator, setSeparator] = useState(existing?.separator ?? "-");
  const [keepName, setKeepName] = useState(existing?.keepName ?? true);
  const [position, setPosition] = useState<"before" | "after">(existing?.position ?? "before");
  const [enumFormat, setEnumFormat] = useState<"numeric" | "alpha" | "alpha-upper">(existing?.format ?? "numeric");
  const [enumSuffix, setEnumSuffix] = useState(existing?.enumSuffix ?? "");
  // Custom template enumerate
  const [customTemplate, setCustomTemplate] = useState(existing?.customTemplate ?? false);
  const [template, setTemplate] = useState(existing?.template ?? "{1} - {name}");
  const [c1Format, setC1Format] = useState<"numeric" | "alpha" | "alpha-upper">(
    existing?.counters?.[0]?.format ?? "numeric",
  );
  const [c1Start, setC1Start] = useState(String(existing?.counters?.[0]?.start ?? 1));
  const [c1Pad, setC1Pad] = useState(String(existing?.counters?.[0]?.pad ?? 0));
  const [c1Every, setC1Every] = useState(String(existing?.counters?.[0]?.every ?? 1));
  const [c2Enabled, setC2Enabled] = useState((existing?.counters?.length ?? 0) >= 2);
  const [c2Format, setC2Format] = useState<"numeric" | "alpha" | "alpha-upper">(
    existing?.counters?.[1]?.format ?? "numeric",
  );
  const [c2Start, setC2Start] = useState(String(existing?.counters?.[1]?.start ?? 1));
  const [c2Pad, setC2Pad] = useState(String(existing?.counters?.[1]?.pad ?? 0));
  const [c2Every, setC2Every] = useState(String(existing?.counters?.[1]?.every ?? 10));
  const [c3Enabled, setC3Enabled] = useState((existing?.counters?.length ?? 0) >= 3);
  const [c3Format, setC3Format] = useState<"numeric" | "alpha" | "alpha-upper">(
    existing?.counters?.[2]?.format ?? "numeric",
  );
  const [c3Start, setC3Start] = useState(String(existing?.counters?.[2]?.start ?? 1));
  const [c3Pad, setC3Pad] = useState(String(existing?.counters?.[2]?.pad ?? 0));
  const [c3Every, setC3Every] = useState(String(existing?.counters?.[2]?.every ?? 100));
  // New step types
  const [swapSeparator, setSwapSeparator] = useState(existing?.swapSeparator ?? " - ");
  const [padWidth, setPadWidth] = useState(String(existing?.padWidth ?? 3));
  const [parentSep, setParentSep] = useState(existing?.parentSeparator ?? " - ");
  const [insertText, setInsertText] = useState(existing?.insertText ?? "");
  const [posIndex, setPosIndex] = useState(String(existing?.positionIndex ?? 0));
  const [posFromEnd, setPosFromEnd] = useState(existing?.positionFromEnd ?? false);
  const [removeCount, setRemoveCount] = useState(String(existing?.removeCount ?? 1));

  function buildStep(): ScriptStep {
    const step: ScriptStep = { type: stepType };
    switch (stepType) {
      case "swap-delimiter":
        step.fromDelimiter = fromDel;
        step.toDelimiter = toDel;
        break;
      case "find-replace":
        step.find = find;
        step.replace = replace;
        step.useRegex = useRegex;
        break;
      case "change-extension":
        step.fromExtension = fromExt;
        step.toExtension = toExt;
        break;
      case "tv-show":
        step.showName = showName || "Show";
        step.season = parseInt(season) || 1;
        step.startEpisode = parseInt(startEp) || 1;
        step.wordDelimiter = wordDel;
        step.suffix = suffix;
        break;
      case "anime":
        step.animeName = animeName || "Anime";
        step.startAnimeEpisode = parseInt(startAnimeEp) || 1;
        step.group = group;
        step.quality = quality;
        break;
      case "movie":
        step.movieName = movieName || "Movie";
        step.year = year;
        step.movieQuality = movieQuality;
        step.wordDelimiter = wordDel;
        break;
      case "sequential":
        step.prefix = prefix;
        step.startNumber = parseInt(startNum) || 1;
        step.zeroPad = parseInt(zeroPad) || 3;
        step.separator = separator;
        break;
      case "enumerate":
        step.customTemplate = customTemplate;
        if (customTemplate) {
          step.template = template;
          const counters: EnumCounter[] = [
            {
              format: c1Format,
              start: parseInt(c1Start) || 1,
              pad: parseInt(c1Pad) || 0,
              every: parseInt(c1Every) || 1,
            },
          ];
          if (c2Enabled) {
            counters.push({
              format: c2Format,
              start: parseInt(c2Start) || 1,
              pad: parseInt(c2Pad) || 0,
              every: parseInt(c2Every) || 1,
            });
          }
          if (c3Enabled) {
            counters.push({
              format: c3Format,
              start: parseInt(c3Start) || 1,
              pad: parseInt(c3Pad) || 0,
              every: parseInt(c3Every) || 1,
            });
          }
          step.counters = counters;
        } else {
          step.prefix = prefix;
          step.startNumber = parseInt(startNum) || 1;
          step.zeroPad = parseInt(zeroPad) || 3;
          step.separator = separator;
          step.keepName = keepName;
          step.position = position;
          step.format = enumFormat;
          step.enumSuffix = enumSuffix;
        }
        break;
      case "swap-parts":
        step.swapSeparator = swapSeparator;
        break;
      case "pad-numbers":
        step.padWidth = parseInt(padWidth) || 3;
        break;
      case "parent-folder":
        step.prefix = prefix || "Folder";
        step.parentSeparator = parentSep;
        break;
      case "insert-at-position":
        step.insertText = insertText;
        step.positionIndex = parseInt(posIndex) || 0;
        step.positionFromEnd = posFromEnd;
        break;
      case "remove-at-position":
        step.positionIndex = parseInt(posIndex) || 0;
        step.removeCount = parseInt(removeCount) || 1;
        step.positionFromEnd = posFromEnd;
        break;
    }
    return step;
  }

  return (
    <Form
      navigationTitle={isEdit ? "Edit Step" : "Add Step"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEdit ? "Save Changes" : "Add Step"}
            icon={isEdit ? Icon.Checkmark : Icon.Plus}
            onSubmit={() => {
              onSubmit(buildStep());
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="stepType" title="Step Type" value={stepType} onChange={(v) => setStepType(v as StepType)}>
        <Form.Dropdown.Section title="Case">
          <Form.Dropdown.Item value="uppercase" title="UPPERCASE" />
          <Form.Dropdown.Item value="lowercase" title="lowercase" />
          <Form.Dropdown.Item value="titlecase" title="Title Case" />
          <Form.Dropdown.Item value="sentencecase" title="Sentence Case" />
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Clean Up">
          <Form.Dropdown.Item value="collapse-spaces" title="Collapse Multiple Spaces" />
          <Form.Dropdown.Item value="swap-delimiter" title="Swap Delimiter" />
          <Form.Dropdown.Item value="find-replace" title="Find & Replace" />
          <Form.Dropdown.Item value="change-extension" title="Change Extension" />
          <Form.Dropdown.Item value="remove-accents" title="Remove Accents" />
          <Form.Dropdown.Item value="strip-digits" title="Strip Digits" />
          <Form.Dropdown.Item value="strip-special" title="Strip Special Characters" />
          <Form.Dropdown.Item value="trim" title="Trim Filename" />
          <Form.Dropdown.Item value="transliterate" title="Transliterate to Latin" />
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Transform">
          <Form.Dropdown.Item value="pad-numbers" title="Add Zero Padding" />
          <Form.Dropdown.Item value="unpad-numbers" title="Remove Zero Padding" />
          <Form.Dropdown.Item value="parent-folder" title="Prepend Parent Folder" />
          <Form.Dropdown.Item value="swap-parts" title="Swap Parts" />
          <Form.Dropdown.Item value="insert-at-position" title="Insert at Position" />
          <Form.Dropdown.Item value="remove-at-position" title="Remove at Position" />
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Rename Format">
          <Form.Dropdown.Item value="tv-show" title="Rename as TV Show" />
          <Form.Dropdown.Item value="anime" title="Rename as Anime" />
          <Form.Dropdown.Item value="movie" title="Rename as Movie" />
          <Form.Dropdown.Item value="sequential" title="Rename Sequentially" />
          <Form.Dropdown.Item value="enumerate" title="Auto Enumerate" />
        </Form.Dropdown.Section>
      </Form.Dropdown>

      <Form.Separator />

      {stepType === "swap-delimiter" && (
        <>
          <Form.TextField id="fromDel" title="From" placeholder="." value={fromDel} onChange={setFromDel} />
          <Form.TextField id="toDel" title="To" placeholder=" " value={toDel} onChange={setToDel} />
        </>
      )}

      {stepType === "find-replace" && (
        <>
          <Form.TextField id="find" title="Find" placeholder="pattern" value={find} onChange={setFind} />
          <Form.TextField id="replace" title="Replace" placeholder="" value={replace} onChange={setReplace} />
          <Form.Checkbox id="useRegex" label="Regular Expression" value={useRegex} onChange={setUseRegex} />
        </>
      )}

      {stepType === "change-extension" && (
        <>
          <Form.TextField
            id="fromExt"
            title="From Extension"
            placeholder="jpeg (empty = all)"
            value={fromExt}
            onChange={setFromExt}
          />
          <Form.TextField id="toExt" title="To Extension" placeholder="jpg" value={toExt} onChange={setToExt} />
        </>
      )}

      {stepType === "tv-show" && (
        <>
          <Form.TextField
            id="showName"
            title="Show Name"
            placeholder="Breaking Bad"
            value={showName}
            onChange={setShowName}
          />
          <Form.TextField
            id="season"
            title="Default Season"
            placeholder="1"
            value={season}
            onChange={setSeason}
            info="Used for files without season info in their name. Files with existing SxxExx are preserved."
          />
          <Form.TextField
            id="startEp"
            title="Default Start Episode"
            placeholder="1"
            value={startEp}
            onChange={setStartEp}
            info="Used for files without episode info in their name."
          />
          <Form.Dropdown id="wordDel" title="Word Separator" value={wordDel} onChange={setWordDel}>
            <Form.Dropdown.Item value=" " title="Space" />
            <Form.Dropdown.Item value="." title="Dot" />
            <Form.Dropdown.Item value="_" title="Underscore" />
            <Form.Dropdown.Item value="-" title="Dash" />
          </Form.Dropdown>
          <Form.TextField
            id="suffix"
            title="Suffix (Optional)"
            placeholder="1080p"
            value={suffix}
            onChange={setSuffix}
          />
        </>
      )}

      {stepType === "anime" && (
        <>
          <Form.TextField
            id="animeName"
            title="Anime Name"
            placeholder="Jujutsu Kaisen"
            value={animeName}
            onChange={setAnimeName}
          />
          <Form.TextField
            id="startAnimeEp"
            title="Start Episode"
            placeholder="1"
            value={startAnimeEp}
            onChange={setStartAnimeEp}
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
        </>
      )}

      {stepType === "movie" && (
        <>
          <Form.TextField
            id="movieName"
            title="Movie Name"
            placeholder="Interstellar"
            value={movieName}
            onChange={setMovieName}
          />
          <Form.TextField id="year" title="Year" placeholder="2014" value={year} onChange={setYear} />
          <Form.TextField
            id="movieQuality"
            title="Quality"
            placeholder="1080p"
            value={movieQuality}
            onChange={setMovieQuality}
          />
        </>
      )}

      {stepType === "sequential" && (
        <>
          <Form.TextField id="prefix" title="Prefix" placeholder="photo" value={prefix} onChange={setPrefix} />
          <Form.TextField id="startNum" title="Start Number" placeholder="1" value={startNum} onChange={setStartNum} />
          <Form.TextField id="zeroPad" title="Zero Padding" placeholder="3" value={zeroPad} onChange={setZeroPad} />
          <Form.Dropdown id="separator" title="Separator" value={separator} onChange={setSeparator}>
            <Form.Dropdown.Item value="-" title="Dash (-)" />
            <Form.Dropdown.Item value="_" title="Underscore (_)" />
            <Form.Dropdown.Item value="." title="Dot (.)" />
            <Form.Dropdown.Item value=" " title="Space" />
          </Form.Dropdown>
        </>
      )}

      {stepType === "enumerate" && (
        <>
          <Form.Checkbox
            id="customTemplate"
            label="Custom Template"
            value={customTemplate}
            onChange={setCustomTemplate}
            info="Use a template with multiple counters for advanced enumeration patterns."
          />

          {!customTemplate && (
            <>
              <Form.Checkbox id="keepName" label="Keep Original Filename" value={keepName} onChange={setKeepName} />
              {keepName && (
                <Form.Dropdown
                  id="position"
                  title="Number Position"
                  value={position}
                  onChange={(v) => setPosition(v as "before" | "after")}
                >
                  <Form.Dropdown.Item value="before" title="Before Name" />
                  <Form.Dropdown.Item value="after" title="After Name" />
                </Form.Dropdown>
              )}
              <Form.Dropdown
                id="enumFormat"
                title="Number Format"
                value={enumFormat}
                onChange={(v) => setEnumFormat(v as "numeric" | "alpha" | "alpha-upper")}
              >
                <Form.Dropdown.Item value="numeric" title="Numeric (001, 002, 003)" />
                <Form.Dropdown.Item value="alpha-upper" title="Alphabetic A, B, C" />
                <Form.Dropdown.Item value="alpha" title="Alphabetic a, b, c" />
              </Form.Dropdown>
              <Form.TextField
                id="prefix"
                title="Prefix (Optional)"
                placeholder="photo"
                value={prefix}
                onChange={setPrefix}
              />
              <Form.TextField
                id="enumSuffix"
                title="Suffix (Optional)"
                placeholder="final"
                value={enumSuffix}
                onChange={setEnumSuffix}
              />
              {enumFormat === "numeric" && (
                <>
                  <Form.TextField
                    id="startNum"
                    title="Start Number"
                    placeholder="1"
                    value={startNum}
                    onChange={setStartNum}
                  />
                  <Form.TextField
                    id="zeroPad"
                    title="Zero Padding"
                    placeholder="3"
                    value={zeroPad}
                    onChange={setZeroPad}
                  />
                </>
              )}
              <Form.Dropdown id="separator" title="Separator" value={separator} onChange={setSeparator}>
                <Form.Dropdown.Item value="-" title="Dash (-)" />
                <Form.Dropdown.Item value="_" title="Underscore (_)" />
                <Form.Dropdown.Item value="." title="Dot (.)" />
                <Form.Dropdown.Item value=" " title="Space" />
              </Form.Dropdown>
            </>
          )}

          {customTemplate && (
            <>
              <Form.TextField
                id="template"
                title="Template"
                placeholder="{1} - {name}"
                value={template}
                onChange={setTemplate}
                info="Use {1}, {2}, {3} for counters and {name} for the original filename. Extension is added automatically."
              />
              <Form.Separator />
              <Form.Description title="Counter {1}" text="Always active." />
              <Form.Dropdown
                id="c1Format"
                title="{1} Format"
                value={c1Format}
                onChange={(v) => setC1Format(v as "numeric" | "alpha" | "alpha-upper")}
              >
                <Form.Dropdown.Item value="numeric" title="Numeric (1, 2, 3)" />
                <Form.Dropdown.Item value="alpha-upper" title="Alphabetic A, B, C" />
                <Form.Dropdown.Item value="alpha" title="Alphabetic a, b, c" />
              </Form.Dropdown>
              <Form.TextField id="c1Start" title="{1} Start" placeholder="1" value={c1Start} onChange={setC1Start} />
              {c1Format === "numeric" && (
                <Form.TextField id="c1Pad" title="{1} Zero Padding" placeholder="0" value={c1Pad} onChange={setC1Pad} />
              )}
              <Form.TextField
                id="c1Every"
                title="{1} Increment Every"
                placeholder="1"
                value={c1Every}
                onChange={setC1Every}
                info="Increment this counter every N files."
              />
              <Form.Separator />
              <Form.Checkbox id="c2Enabled" label="Enable Counter {2}" value={c2Enabled} onChange={setC2Enabled} />
              {c2Enabled && (
                <>
                  <Form.Dropdown
                    id="c2Format"
                    title="{2} Format"
                    value={c2Format}
                    onChange={(v) => setC2Format(v as "numeric" | "alpha" | "alpha-upper")}
                  >
                    <Form.Dropdown.Item value="numeric" title="Numeric (1, 2, 3)" />
                    <Form.Dropdown.Item value="alpha-upper" title="Alphabetic A, B, C" />
                    <Form.Dropdown.Item value="alpha" title="Alphabetic a, b, c" />
                  </Form.Dropdown>
                  <Form.TextField
                    id="c2Start"
                    title="{2} Start"
                    placeholder="1"
                    value={c2Start}
                    onChange={setC2Start}
                  />
                  {c2Format === "numeric" && (
                    <Form.TextField
                      id="c2Pad"
                      title="{2} Zero Padding"
                      placeholder="0"
                      value={c2Pad}
                      onChange={setC2Pad}
                    />
                  )}
                  <Form.TextField
                    id="c2Every"
                    title="{2} Increment Every"
                    placeholder="10"
                    value={c2Every}
                    onChange={setC2Every}
                  />
                </>
              )}
              <Form.Separator />
              <Form.Checkbox id="c3Enabled" label="Enable Counter {3}" value={c3Enabled} onChange={setC3Enabled} />
              {c3Enabled && (
                <>
                  <Form.Dropdown
                    id="c3Format"
                    title="{3} Format"
                    value={c3Format}
                    onChange={(v) => setC3Format(v as "numeric" | "alpha" | "alpha-upper")}
                  >
                    <Form.Dropdown.Item value="numeric" title="Numeric (1, 2, 3)" />
                    <Form.Dropdown.Item value="alpha-upper" title="Alphabetic A, B, C" />
                    <Form.Dropdown.Item value="alpha" title="Alphabetic a, b, c" />
                  </Form.Dropdown>
                  <Form.TextField
                    id="c3Start"
                    title="{3} Start"
                    placeholder="1"
                    value={c3Start}
                    onChange={setC3Start}
                  />
                  {c3Format === "numeric" && (
                    <Form.TextField
                      id="c3Pad"
                      title="{3} Zero Padding"
                      placeholder="0"
                      value={c3Pad}
                      onChange={setC3Pad}
                    />
                  )}
                  <Form.TextField
                    id="c3Every"
                    title="{3} Increment Every"
                    placeholder="100"
                    value={c3Every}
                    onChange={setC3Every}
                  />
                </>
              )}
              <Form.Separator />
              <Form.Description
                title="Preview"
                text={(() => {
                  const tmpl = template || "{1} - {name}";
                  const lines: string[] = [];
                  for (let fi = 0; fi < 3; fi++) {
                    let result = tmpl;
                    const allCounters = [
                      {
                        format: c1Format,
                        start: parseInt(c1Start) || 1,
                        pad: parseInt(c1Pad) || 0,
                        every: parseInt(c1Every) || 1,
                      },
                      ...(c2Enabled
                        ? [
                            {
                              format: c2Format,
                              start: parseInt(c2Start) || 1,
                              pad: parseInt(c2Pad) || 0,
                              every: parseInt(c2Every) || 1,
                            },
                          ]
                        : []),
                      ...(c3Enabled
                        ? [
                            {
                              format: c3Format,
                              start: parseInt(c3Start) || 1,
                              pad: parseInt(c3Pad) || 0,
                              every: parseInt(c3Every) || 1,
                            },
                          ]
                        : []),
                    ];
                    for (let c = 0; c < allCounters.length; c++) {
                      const cnt = allCounters[c];
                      const every = Math.max(1, cnt.every);
                      const val = cnt.start + Math.floor(fi / every);
                      const formatted = formatIndex(val, cnt.format, cnt.pad);
                      result = result.replace(new RegExp(`\\{${c + 1}\\}`, "g"), formatted);
                    }
                    result = result.replace(/\{name\}/g, "filename");
                    lines.push(`${result}.ext`);
                  }
                  return lines.join(",  ");
                })()}
              />
            </>
          )}
        </>
      )}

      {stepType === "swap-parts" && (
        <Form.TextField
          id="swapSeparator"
          title="Separator"
          placeholder=" - "
          value={swapSeparator}
          onChange={setSwapSeparator}
          info='Swap the two parts of the filename around this separator. E.g. "Artist - Song" becomes "Song - Artist".'
        />
      )}

      {stepType === "pad-numbers" && (
        <Form.TextField
          id="padWidth"
          title="Pad Width"
          placeholder="3"
          value={padWidth}
          onChange={setPadWidth}
          info="Pad numbers in filenames to this many digits. E.g. 3 turns file1 into file001."
        />
      )}

      {stepType === "parent-folder" && (
        <>
          <Form.TextField
            id="parentPrefix"
            title="Folder Name"
            placeholder="Folder"
            value={prefix}
            onChange={setPrefix}
            info="The folder name to prepend. When run in a script, this uses the value you type here."
          />
          <Form.TextField
            id="parentSep"
            title="Separator"
            placeholder=" - "
            value={parentSep}
            onChange={setParentSep}
          />
        </>
      )}

      {stepType === "insert-at-position" && (
        <>
          <Form.TextField
            id="insertText"
            title="Text to Insert"
            placeholder="prefix_"
            value={insertText}
            onChange={setInsertText}
          />
          <Form.TextField
            id="posIndex"
            title="Position"
            placeholder="0"
            value={posIndex}
            onChange={setPosIndex}
            info="Character position to insert at. 0 = beginning of filename."
          />
          <Form.Checkbox id="posFromEnd" label="Count from End" value={posFromEnd} onChange={setPosFromEnd} />
        </>
      )}

      {stepType === "remove-at-position" && (
        <>
          <Form.TextField
            id="posIndex"
            title="Start Position"
            placeholder="0"
            value={posIndex}
            onChange={setPosIndex}
            info="Character position to start removing from."
          />
          <Form.TextField
            id="removeCount"
            title="Characters to Remove"
            placeholder="1"
            value={removeCount}
            onChange={setRemoveCount}
          />
          <Form.Checkbox id="posFromEnd" label="Count from End" value={posFromEnd} onChange={setPosFromEnd} />
        </>
      )}

      {/* No-config steps */}
      {[
        "uppercase",
        "lowercase",
        "titlecase",
        "sentencecase",
        "collapse-spaces",
        "remove-accents",
        "strip-digits",
        "strip-special",
        "trim",
        "unpad-numbers",
        "transliterate",
      ].includes(stepType) && <Form.Description title="" text="This step has no additional configuration." />}
    </Form>
  );
}

// ─── Main Create Script Command ───

export default function CreateScript({
  existingScript,
  onSaved,
}: { existingScript?: RenameScript; onSaved?: () => void } = {}) {
  const { push, pop } = useNavigation();
  const isEditing = !!existingScript;
  const [scriptId] = useState(existingScript?.id ?? randomUUID());
  const [scriptName, setScriptName] = useState(existingScript?.name ?? "");
  const [description, setDescription] = useState(existingScript?.description ?? "");
  const [fileFilter, setFileFilter] = useState(existingScript?.fileFilter ?? "");
  const [steps, setSteps] = useState<ScriptStep[]>(existingScript?.steps ?? []);

  function addStep(step: ScriptStep) {
    setSteps([...steps, step]);
  }

  function editStep(index: number, updated: ScriptStep) {
    const newSteps = [...steps];
    newSteps[index] = updated;
    setSteps(newSteps);
  }

  function removeStep(index: number) {
    setSteps(steps.filter((_, i) => i !== index));
  }

  function moveStepUp(index: number) {
    if (index === 0) return;
    const newSteps = [...steps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
    setSteps(newSteps);
  }

  function moveStepDown(index: number) {
    if (index >= steps.length - 1) return;
    const newSteps = [...steps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
    setSteps(newSteps);
  }

  async function handleSave() {
    if (!scriptName.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Script name is required" });
      return;
    }
    if (steps.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Add at least one step" });
      return;
    }

    const script: RenameScript = {
      id: scriptId,
      name: scriptName.trim(),
      description: description.trim(),
      fileFilter: fileFilter.trim(),
      steps,
      createdAt: existingScript?.createdAt ?? Date.now(),
    };

    await saveScript(script);
    if (onSaved) onSaved();
    if (isEditing) {
      pop();
      await showHUD(`Script "${script.name}" updated`);
    } else {
      await showHUD(`Script "${script.name}" saved`);
    }
  }

  async function handlePreview() {
    if (steps.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Add at least one step" });
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Loading files from Finder..." });

    const folderPath = await getFinderFolder();
    if (!folderPath) {
      await showToast({ style: Toast.Style.Failure, title: "Open a Finder window to preview" });
      return;
    }

    const entries = await readdir(folderPath);
    const files: string[] = [];
    for (const entry of entries) {
      if (entry.startsWith(".")) continue;
      const s = await stat(join(folderPath, entry));
      if (s.isFile()) files.push(entry);
    }
    files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

    if (files.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No files in folder" });
      return;
    }

    const script: RenameScript = {
      id: "preview",
      name: "Preview",
      description: "",
      fileFilter: fileFilter.trim(),
      steps,
      createdAt: Date.now(),
    };

    const results = executeScript(files, script);

    push(
      <List navigationTitle="Script Preview">
        {results.map((r, i) => {
          const changed = r.original !== r.renamed;
          return (
            <List.Item
              key={i}
              icon={{
                source: !r.matched ? Icon.Minus : changed ? Icon.ArrowRight : Icon.Checkmark,
                tintColor: !r.matched ? Color.SecondaryText : changed ? Color.Blue : Color.Green,
              }}
              title={r.original}
              subtitle={r.matched ? (changed ? `→ ${r.renamed}` : "(unchanged)") : "(filtered out)"}
            />
          );
        })}
      </List>,
    );
  }

  return (
    <List
      navigationTitle={isEditing ? `Edit: ${existingScript?.name}` : undefined}
      searchBarPlaceholder="Script pipeline..."
      actions={
        <ActionPanel>
          <Action title="Add Step" icon={Icon.Plus} onAction={() => push(<StepForm onSubmit={addStep} />)} />
          <Action
            title="Preview on Finder Folder"
            icon={Icon.Eye}
            onAction={handlePreview}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
          <Action
            title="Save Script"
            icon={Icon.SaveDocument}
            onAction={handleSave}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Script Info">
        <List.Item
          icon={Icon.Pencil}
          title={scriptName || "Untitled Script"}
          subtitle={description || "No description"}
          accessories={[{ text: fileFilter ? `Filter: ${fileFilter}` : "All files" }]}
          actions={
            <ActionPanel>
              <Action
                title="Edit Script Info"
                icon={Icon.Pencil}
                onAction={() =>
                  push(
                    <Form
                      navigationTitle="Script Info"
                      actions={
                        <ActionPanel>
                          <Action.SubmitForm
                            title="Done"
                            onSubmit={(values: { name: string; desc: string; filter: string }) => {
                              setScriptName(values.name);
                              setDescription(values.desc);
                              setFileFilter(values.filter);
                              pop();
                            }}
                          />
                        </ActionPanel>
                      }
                    >
                      <Form.TextField
                        id="name"
                        title="Script Name"
                        placeholder="Clean MKV files"
                        defaultValue={scriptName}
                      />
                      <Form.TextField
                        id="desc"
                        title="Description"
                        placeholder="Swap dots, title case, rename as TV show"
                        defaultValue={description}
                      />
                      <Form.TextField
                        id="filter"
                        title="File Filter"
                        placeholder="*.mkv, *.mp4 (empty = all files)"
                        defaultValue={fileFilter}
                        info="Glob pattern. Examples: *.mkv, *.{mkv,mp4}, photo_*"
                      />
                    </Form>,
                  )
                }
              />
              <Action
                title="Add Step"
                icon={Icon.Plus}
                onAction={() => push(<StepForm onSubmit={addStep} />)}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action
                title="Preview on Finder Folder"
                icon={Icon.Eye}
                onAction={handlePreview}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              />
              <Action
                title="Save Script"
                icon={Icon.SaveDocument}
                onAction={handleSave}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title={`Pipeline (${steps.length} step${steps.length === 1 ? "" : "s"})`}>
        {steps.length === 0 && (
          <List.Item
            icon={{ source: Icon.Plus, tintColor: Color.SecondaryText }}
            title="No steps yet"
            subtitle="Press Enter to add a step"
            actions={
              <ActionPanel>
                <Action title="Add Step" icon={Icon.Plus} onAction={() => push(<StepForm onSubmit={addStep} />)} />
              </ActionPanel>
            }
          />
        )}
        {steps.map((step, i) => (
          <List.Item
            key={`${i}-${step.type}`}
            icon={{ source: Icon.ChevronRight, tintColor: Color.Blue }}
            title={`Step ${i + 1}: ${stepTypeLabel(step.type)}`}
            subtitle={stepLabel(step)}
            actions={
              <ActionPanel>
                <Action
                  title="Edit Step"
                  icon={Icon.Pencil}
                  onAction={() => push(<StepForm existing={step} onSubmit={(updated) => editStep(i, updated)} />)}
                />
                <Action
                  title="Add Step"
                  icon={Icon.Plus}
                  onAction={() => push(<StepForm onSubmit={addStep} />)}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
                <Action
                  title="Move up"
                  icon={Icon.ArrowUp}
                  onAction={() => moveStepUp(i)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                />
                <Action
                  title="Move Down"
                  icon={Icon.ArrowDown}
                  onAction={() => moveStepDown(i)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                />
                <Action
                  title="Remove Step"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => removeStep(i)}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                />
                <Action
                  title="Preview on Finder Folder"
                  icon={Icon.Eye}
                  onAction={handlePreview}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                />
                <Action
                  title="Save Script"
                  icon={Icon.SaveDocument}
                  onAction={handleSave}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
