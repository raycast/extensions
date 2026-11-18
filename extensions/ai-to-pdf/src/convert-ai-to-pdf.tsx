import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getSelectedFinderItems,
  Icon,
  popToRoot,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { basename } from "path";
import { useEffect, useMemo, useState } from "react";
import { detectBleed } from "./lib/ai-file";
import { formatMm } from "./lib/bleed";
import { describeBleed, isAiFile, runJobs, summarize, type BleedChoice, type Job, type JobResult } from "./lib/convert";
import { isIllustratorRunning, listPdfPresets, presetUsesDocumentBleed } from "./lib/illustrator";
import { getSettings } from "./lib/settings";

const KEEP_CURRENT_SETTINGS = "__current__";

export default function Command() {
  const settings = getSettings();
  const { push } = useNavigation();
  const [isConverting, setIsConverting] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [bleedMode, setBleedMode] = useState<string>(settings.defaultBleedMode);
  const [fileError, setFileError] = useState<string | undefined>();
  const [customError, setCustomError] = useState<string | undefined>();

  // Pre-fill with whatever is selected in Finder, so the common case is one keystroke.
  const { data: selectedFiles } = usePromise(async () => {
    try {
      const items = await getSelectedFinderItems();
      return items.map((item) => item.path).filter(isAiFile);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (selectedFiles && selectedFiles.length > 0) {
      setFiles(selectedFiles);
    }
  }, [selectedFiles]);

  // Reading the preset list cold-launches Illustrator, so only ask when it is already up.
  const { data: presets, isLoading: isLoadingPresets } = useCachedPromise(
    async () => ((await isIllustratorRunning()) ? await listPdfPresets() : []),
    [],
    { initialData: [] as string[], keepPreviousData: true },
  );

  // Both of these read from disk — the preset files and the picked .ai files — so
  // they are kept out of the render path that a keystroke in the form triggers.
  const presetOptions = useMemo(
    () =>
      Array.from(new Set([...(presets ?? []), settings.pdfPreset].filter(Boolean))).map((preset) => ({
        name: preset,
        documentBleedOnly: presetUsesDocumentBleed(preset),
      })),
    [presets, settings.pdfPreset],
  );
  const detected = useMemo(() => describeDetected(files), [files]);

  async function handleSubmit(values: { bleed: string; customBleedMm: string; preset: string; destination: string[] }) {
    const aiFiles = files.filter(isAiFile);
    if (aiFiles.length === 0) {
      setFileError("Pick at least one .ai file");
      return;
    }
    setFileError(undefined);

    let bleed: BleedChoice;
    if (values.bleed === "off") {
      bleed = { mode: "off" };
    } else if (values.bleed === "custom") {
      const mm = Number.parseFloat((values.customBleedMm ?? "").replace(",", "."));
      if (!Number.isFinite(mm) || mm < 0 || mm > 100) {
        setCustomError("Enter a bleed between 0 and 100 mm");
        return;
      }
      bleed = { mode: "custom", mm };
    } else {
      bleed = { mode: "file" };
    }
    setCustomError(undefined);

    const jobs: Job[] = aiFiles.map((input) => ({
      input,
      bleed,
      preset: values.preset === KEEP_CURRENT_SETTINGS ? "" : values.preset,
      destination: values.destination?.[0],
    }));

    setIsConverting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: aiFiles.length === 1 ? `Converting ${basename(aiFiles[0])}` : `Converting ${aiFiles.length} files`,
    });

    const results = await runJobs(jobs, settings, (done, total, current) => {
      if (total > 1) {
        toast.title = `Converting ${done + 1}/${total}`;
        toast.message = current;
      }
    });
    setIsConverting(false);

    const { succeeded, failed } = summarize(results);
    const first = succeeded[0];

    if (failed.length === 0 && first && "output" in first) {
      toast.style = Toast.Style.Success;
      toast.title = succeeded.length === 1 ? "PDF created" : `${succeeded.length} PDFs created`;
      toast.message = succeeded.length === 1 ? `${basename(first.output)} — ${describeBleed(first)}` : undefined;

      if (settings.revealInFinder) {
        await showInFinder(first.output);
      }
      await popToRoot();
      return;
    }

    await toast.hide();
    push(<ResultDetail results={results} />);
  }

  return (
    <Form
      isLoading={isConverting || isLoadingPresets}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert to PDF" icon={Icon.Document} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="Illustrator Files"
        allowMultipleSelection
        canChooseDirectories={false}
        value={files}
        onChange={(newFiles) => {
          setFiles(newFiles);
          setFileError(undefined);
        }}
        error={fileError}
        info="Only .ai files are converted; anything else is ignored."
      />

      <Form.Dropdown
        id="bleed"
        title="Bleed"
        value={bleedMode}
        onChange={setBleedMode}
        storeValue
        info="Illustrator rounds a bleed it is handed up to whole points, so 3 mm is exported as 3.2 mm. Only a PDF preset with Use Document Bleed Settings writes a document's bleed out exactly."
      >
        <Form.Dropdown.Item
          value="file"
          title={`From the file${detected ? ` — ${detected}` : ""}`}
          icon={Icon.Document}
        />
        <Form.Dropdown.Item value="custom" title="Custom" icon={Icon.Pencil} />
        <Form.Dropdown.Item value="off" title="Off — trim size" icon={Icon.Minimize} />
      </Form.Dropdown>

      {bleedMode === "custom" && (
        <Form.TextField
          id="customBleedMm"
          title="Bleed in mm"
          defaultValue={String(settings.customBleedMm)}
          placeholder="3"
          error={customError}
          onChange={() => setCustomError(undefined)}
          info="Rounded up to a whole point, because Illustrator stores the bleed in whole points and would otherwise round it down."
        />
      )}

      <Form.Dropdown
        id="preset"
        title="PDF Preset"
        defaultValue={settings.pdfPreset || KEEP_CURRENT_SETTINGS}
        storeValue
        info="Illustrator's own PDF export presets. Start Illustrator to see your custom presets here."
      >
        {presetOptions.map((preset) => (
          <Form.Dropdown.Item
            key={preset.name}
            value={preset.name}
            title={preset.documentBleedOnly ? `${preset.name} — document bleed only` : preset.name}
            icon={preset.documentBleedOnly ? Icon.Info : undefined}
          />
        ))}
        <Form.Dropdown.Item value={KEEP_CURRENT_SETTINGS} title="Illustrator's current settings" />
      </Form.Dropdown>

      <Form.FilePicker
        id="destination"
        title="Output Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        defaultValue={settings.destination ? [settings.destination] : []}
        info="Leave empty to save the PDF next to the .ai file."
      />
    </Form>
  );
}

/** Summary of the bleed found in the picked files, for the dropdown label. */
function describeDetected(files: string[]): string | undefined {
  const aiFiles = files.filter(isAiFile);
  if (aiFiles.length === 0) {
    return undefined;
  }

  const found = aiFiles.map((file) => detectBleed(file));
  if (found.some((bleed) => bleed === undefined)) {
    return aiFiles.length === 1 ? "not readable" : "unreadable in some files";
  }

  const labels = new Set(found.map((bleed) => formatMm(bleed!.maxPt)));
  return labels.size === 1 ? [...labels][0] : "differs per file";
}

function ResultDetail({ results }: { results: JobResult[] }) {
  const { succeeded, failed } = summarize(results);

  const lines = results.map((result) =>
    "error" in result
      ? `- ❌ **${basename(result.input)}** — ${result.error}`
      : `- ✅ **${basename(result.input)}** → \`${basename(result.output)}\` (${describeBleed(result)})`,
  );

  const markdown = [`# ${succeeded.length} converted, ${failed.length} failed`, "", ...lines].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Error Details"
            content={failed.map((result) => `${basename(result.input)}: ${result.error}`).join("\n")}
          />
          {succeeded.length > 0 && "output" in succeeded[0] && (
            <Action.ShowInFinder title="Show PDF in Finder" path={succeeded[0].output} />
          )}
        </ActionPanel>
      }
    />
  );
}
