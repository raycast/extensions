import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  LocalStorage,
  updateCommandMetadata,
  confirmAlert,
  Alert,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { access, constants } from "fs/promises";
import { getExternalVolumes, VolumeInfo } from "./utils/volumes";
import { DEFAULT_DESTINATION } from "./utils/constants";
import { checkExiftool, scanDatesOnFiles } from "./utils/exif";
import { scanMultipleVolumes } from "./utils/scanner";
import { runIngestPipeline } from "./pipeline";
import { listActiveJobs } from "./utils/jobs";

const MAX_CONCURRENT_JOBS = 3;

const RECENT_KEY = "recent-presets";
const MAX_RECENT = 10;

interface IngestPreset {
  id: string;
  label: string;
  savedAt: string;
  destParent: string;
  folderName: string;
  job: string;
  client: string;
  targetDates: string[];
  starRating: string;
  renameFiles: boolean;
  skipDuplicates: boolean;
  verifyCopy: boolean;
  openPhotoMechanic: boolean;
  ejectCards: boolean;
}

async function loadRecentPresets(): Promise<IngestPreset[]> {
  try {
    const raw = await LocalStorage.getItem<string>(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function savePreset(preset: IngestPreset): Promise<void> {
  const existing = await loadRecentPresets();
  // Remove any preset with the same folderName (same shoot)
  const filtered = existing.filter((p) => p.folderName !== preset.folderName);
  const updated = [preset, ...filtered].slice(0, MAX_RECENT);
  await LocalStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

interface DateOption {
  date: string; // YYYY-MM-DD
  label: string; // human-readable, e.g. "Feb 25, 2026"
  count: number; // files on that date
  cardCount: number; // how many cards contribute to this date
}

export default function Command() {
  // Clear any stale subtitle from this command
  useEffect(() => {
    updateCommandMetadata({ subtitle: "" });
  }, []);

  // Recent presets
  const [recentPresets, setRecentPresets] = useState<IngestPreset[]>([]);
  const pendingDatesRef = useRef<string[] | null>(null);

  // Volume detection
  const [volumes, setVolumes] = useState<VolumeInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [destinationParent, setDestinationParent] = useState<string[]>([DEFAULT_DESTINATION]);
  const [job, setJob] = useState("");
  const [client, setClient] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [starRating, setStarRating] = useState("off");
  const [renameFiles, setRenameFiles] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [verifyCopy, setVerifyCopy] = useState(true);
  const [openPhotoMechanic, setOpenPhotoMechanic] = useState(true);
  const [ejectCards, setEjectCards] = useState(false);

  // Date scanning state
  const [dateOptions, setDateOptions] = useState<DateOption[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const scanGenRef = useRef(0);

  // Scan selected cards for dates. Accepts optional volList to avoid
  // stale closure over `volumes` state (needed for auto-select on mount).
  async function scanCardDates(cardPaths: string[], volList?: VolumeInfo[]) {
    setSelectedCards(cardPaths);
    setSelectedDates([]);
    setDateOptions([]);

    if (cardPaths.length === 0) return;

    // Increment generation so any in-flight scan can detect it became stale
    const gen = ++scanGenRef.current;

    setIsScanning(true);
    try {
      const vols = volList ?? volumes;
      const selectedVols = vols.filter((v) => cardPaths.includes(v.path)).map((v) => ({ path: v.path, name: v.name }));

      const files = await scanMultipleVolumes(selectedVols);
      const mediaFiles = files.filter((f) => !f.isSidecar);
      const dateInfos = await scanDatesOnFiles(mediaFiles);

      // Bail out if a newer scan has already started
      if (gen !== scanGenRef.current) return;

      // Sort dates descending (most recent first)
      const sorted = Array.from(dateInfos.entries()).sort((a, b) => b[0].localeCompare(a[0]));

      const options: DateOption[] = sorted.map(([date, info]) => ({
        date,
        label: formatDateLabel(date),
        count: info.count,
        cardCount: info.cardCount,
      }));

      setDateOptions(options);

      // Auto-select dates if a preset was just loaded
      if (pendingDatesRef.current) {
        const available = new Set(options.map((o) => o.date));
        const toSelect = pendingDatesRef.current.filter((d) => available.has(d));
        if (toSelect.length > 0) setSelectedDates(toSelect);
        pendingDatesRef.current = null;
      }
    } catch {
      if (gen !== scanGenRef.current) return;
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to scan card dates",
      });
    } finally {
      if (gen === scanGenRef.current) setIsScanning(false);
    }
  }

  function applyPreset(presetId: string) {
    if (presetId === "") return;
    const preset = recentPresets.find((p) => p.id === presetId);
    if (!preset) return;
    setJob(preset.job);
    setClient(preset.client);
    setDestinationParent([preset.destParent]);
    setStarRating(preset.starRating);
    setRenameFiles(preset.renameFiles);
    setSkipDuplicates(preset.skipDuplicates);
    setVerifyCopy(preset.verifyCopy);
    setOpenPhotoMechanic(preset.openPhotoMechanic);
    setEjectCards(preset.ejectCards);
    // Dates will be auto-selected once the card scan completes
    pendingDatesRef.current = preset.targetDates;
  }

  // Load volumes and presets on mount; auto-select if only one card
  useEffect(() => {
    loadRecentPresets().then(setRecentPresets);
    getExternalVolumes().then((vols) => {
      setVolumes(vols);
      setIsLoading(false);
      if (vols.length === 1) {
        scanCardDates([vols[0].path], vols);
      }
    });
  }, []);

  async function handleSubmit() {
    // Validation
    if (selectedCards.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select at least one card",
      });
      return;
    }
    if (!job.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Job is required" });
      return;
    }
    if (!client.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Client is required",
      });
      return;
    }
    if (selectedDates.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select at least one date",
      });
      return;
    }

    if (starRating !== "off") {
      const hasExiftool = await checkExiftool();
      if (!hasExiftool) {
        await showToast({
          style: Toast.Style.Failure,
          title: "exiftool not found",
          message: "Install with: brew install exiftool",
        });
        return;
      }
    }

    const destParent = destinationParent[0] || DEFAULT_DESTINATION;
    try {
      await access(destParent, constants.W_OK);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Destination not writable",
        message: `Cannot write to ${destParent}`,
      });
      return;
    }

    // Concurrency guard: soft-warn if already at or above the soft cap.
    const activeJobs = await listActiveJobs();
    if (activeJobs.length >= MAX_CONCURRENT_JOBS) {
      const ok = await confirmAlert({
        title: `${activeJobs.length} ingests already running`,
        message: "Running more in parallel may slow all of them down (shared disk I/O). Start another anyway?",
        primaryAction: {
          title: "Start Anyway",
          style: Alert.ActionStyle.Default,
        },
      });
      if (!ok) return;
    }

    const selectedVolumes = volumes.filter((v) => selectedCards.includes(v.path));

    // Use earliest selected date for folder name
    const sortedDates = [...selectedDates].sort();
    const earliestDate = sortedDates[0];
    const folderName = `${earliestDate.replace(/-/g, "")}_${job.trim().toLowerCase().replace(/\s+/g, "-")}_${client.trim().toLowerCase().replace(/\s+/g, "-")}`;

    const parsedStarRating = starRating === "off" ? null : parseInt(starRating, 10);

    // Save preset for future re-use
    await savePreset({
      id: `${Date.now()}`,
      label: `${job.trim()} / ${client.trim()}`,
      savedAt: new Date().toISOString(),
      destParent,
      folderName,
      job: job.trim(),
      client: client.trim(),
      targetDates: selectedDates,
      starRating,
      renameFiles,
      skipDuplicates,
      verifyCopy,
      openPhotoMechanic,
      ejectCards,
    });

    await runIngestPipeline({
      volumes: selectedVolumes,
      destParent,
      folderName,
      targetDates: selectedDates,
      starRating: parsedStarRating,
      renameFiles,
      skipDuplicates,
      verifyCopy,
      openPhotoMechanic,
      ejectCards,
    });
  }

  return (
    <Form
      isLoading={isLoading || isScanning}
      navigationTitle="Magic Ingest"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Ingest" onSubmit={handleSubmit} icon={Icon.Download} />
          <Action
            title="View Ingest Jobs"
            icon={Icon.List}
            onAction={() =>
              launchCommand({
                name: "ingest-status",
                type: LaunchType.UserInitiated,
              })
            }
          />
        </ActionPanel>
      }
    >
      {recentPresets.length > 0 && (
        <Form.Dropdown id="recentPreset" title="Recent" onChange={applyPreset} filtering={false}>
          <Form.Dropdown.Item value="" title="New Ingest" icon={Icon.Plus} />
          {recentPresets.map((p) => (
            <Form.Dropdown.Item key={p.id} value={p.id} title={p.label} icon={Icon.Clock} />
          ))}
        </Form.Dropdown>
      )}

      <Form.TagPicker id="sourceCards" title="Source Cards" value={selectedCards} onChange={scanCardDates}>
        {volumes.map((vol) => (
          <Form.TagPicker.Item key={vol.path} value={vol.path} title={vol.name} icon={Icon.HardDrive} />
        ))}
      </Form.TagPicker>

      <Form.FilePicker
        id="destinationParent"
        title="Destination"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        value={destinationParent}
        onChange={setDestinationParent}
      />

      <Form.TextField
        id="job"
        title="Job"
        placeholder="protest, portrait, assignment..."
        value={job}
        onChange={setJob}
      />
      <Form.TextField
        id="client"
        title="Client"
        placeholder="reuters, nyt, personal..."
        value={client}
        onChange={setClient}
      />
      <Form.TagPicker id="dateFilter" title="Dates" value={selectedDates} onChange={setSelectedDates}>
        {dateOptions.map((opt) => (
          <Form.TagPicker.Item
            key={opt.date}
            value={opt.date}
            title={`${opt.label} (${opt.count})${opt.cardCount > 1 ? ` · ${opt.cardCount} cards` : ""}`}
            icon={Icon.Calendar}
          />
        ))}
      </Form.TagPicker>
      <Form.Dropdown id="starRating" title="Stars" value={starRating} onChange={setStarRating} filtering={false}>
        <Form.Dropdown.Item value="off" title="Off" />
        <Form.Dropdown.Item value="0" title="Unrated" />
        <Form.Dropdown.Item value="1" title="★" />
        <Form.Dropdown.Item value="2" title="★★" />
        <Form.Dropdown.Item value="3" title="★★★" />
        <Form.Dropdown.Item value="4" title="★★★★" />
        <Form.Dropdown.Item value="5" title="★★★★★" />
      </Form.Dropdown>
      <Form.Checkbox
        id="renameFiles"
        label="Rename files with folder prefix"
        value={renameFiles}
        onChange={setRenameFiles}
      />
      <Form.Checkbox id="skipDuplicates" label="Skip duplicates" value={skipDuplicates} onChange={setSkipDuplicates} />
      <Form.Checkbox id="verifyCopy" label="Verify copy (SHA-256)" value={verifyCopy} onChange={setVerifyCopy} />
      <Form.Checkbox
        id="openPhotoMechanic"
        label="Open in Photo Mechanic"
        value={openPhotoMechanic}
        onChange={setOpenPhotoMechanic}
      />
      <Form.Checkbox id="ejectCards" label="Eject cards when done" value={ejectCards} onChange={setEjectCards} />
    </Form>
  );
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const base = `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterday = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, "0")}-${String(yest.getDate()).padStart(2, "0")}`;

  if (dateStr === today) return `${base} (Today)`;
  if (dateStr === yesterday) return `${base} (Yesterday)`;
  return base;
}
