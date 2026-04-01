import {
  ActionPanel,
  Action,
  Form,
  List,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Color,
  confirmAlert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { readFile, readdir, stat, rename as fsRename } from "fs/promises";
import { join, extname, basename } from "path";
import exifReader from "exif-reader";
import { getFinderFolder } from "./finder";
import { saveUndoState } from "./instant-runner";

interface ExifInfo {
  dateTaken?: Date;
  cameraMake?: string;
  cameraModel?: string;
  iso?: number;
  focalLength?: number;
  width?: number;
  height?: number;
}

const IMAGE_EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".tiff",
  ".tif",
  ".png",
  ".heic",
  ".heif",
  ".webp",
  ".arw",
  ".cr2",
  ".nef",
  ".dng",
]);

async function extractExif(filePath: string): Promise<ExifInfo | null> {
  try {
    const buffer = await readFile(filePath);
    let exifBuffer: Buffer | null = null;

    // Find EXIF in JPEG (starts with FF D8)
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.length - 1) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        if (marker === 0xe1) {
          const len = buffer.readUInt16BE(offset + 2);
          const exifHeader = buffer.slice(offset + 4, offset + 8).toString("ascii");
          if (exifHeader === "Exif") {
            exifBuffer = buffer.slice(offset + 10, offset + 2 + len);
          }
          break;
        }
        if (marker === 0xda) break;
        const len = buffer.readUInt16BE(offset + 2);
        offset += 2 + len;
      }
    } else if ((buffer[0] === 0x49 && buffer[1] === 0x49) || (buffer[0] === 0x4d && buffer[1] === 0x4d)) {
      exifBuffer = buffer;
    }

    if (!exifBuffer) return null;
    const exif = exifReader(exifBuffer);

    const info: ExifInfo = {};

    // Date taken
    if (exif.Photo?.DateTimeOriginal) {
      info.dateTaken = new Date(exif.Photo.DateTimeOriginal);
    } else if (exif.Image?.DateTime) {
      info.dateTaken = new Date(exif.Image.DateTime);
    }

    // Camera
    if (exif.Image?.Make) info.cameraMake = String(exif.Image.Make).trim();
    if (exif.Image?.Model) info.cameraModel = String(exif.Image.Model).trim();

    // Settings
    if (exif.Photo?.ISOSpeedRatings) info.iso = Number(exif.Photo.ISOSpeedRatings);
    if (exif.Photo?.FocalLength) info.focalLength = Number(exif.Photo.FocalLength);
    if (exif.Photo?.PixelXDimension) info.width = Number(exif.Photo.PixelXDimension);
    if (exif.Photo?.PixelYDimension) info.height = Number(exif.Photo.PixelYDimension);

    return info;
  } catch {
    return null;
  }
}

function padNum(n: number, w: number): string {
  return String(n).padStart(w, "0");
}

function formatExifDate(date: Date, format: string): string {
  const y = date.getFullYear();
  const m = padNum(date.getMonth() + 1, 2);
  const d = padNum(date.getDate(), 2);
  const hh = padNum(date.getHours(), 2);
  const mm = padNum(date.getMinutes(), 2);
  const ss = padNum(date.getSeconds(), 2);

  switch (format) {
    case "YYYY-MM-DD":
      return `${y}-${m}-${d}`;
    case "YYYY-MM-DD_HH-MM-SS":
      return `${y}-${m}-${d}_${hh}-${mm}-${ss}`;
    case "DD-MM-YYYY":
      return `${d}-${m}-${y}`;
    case "YYYYMMDD":
      return `${y}${m}${d}`;
    default:
      return `${y}-${m}-${d}_${hh}-${mm}-${ss}`;
  }
}

function buildExifName(fileName: string, exif: ExifInfo, index: number, template: string, dateFormat: string): string {
  const ext = extname(fileName);
  const originalName = fileName.slice(0, fileName.length - ext.length);

  let result = template;
  result = result.replace(/\{date\}/g, exif.dateTaken ? formatExifDate(exif.dateTaken, dateFormat) : "unknown-date");
  result = result.replace(/\{make\}/g, exif.cameraMake ?? "unknown");
  result = result.replace(/\{model\}/g, exif.cameraModel ?? "unknown");
  result = result.replace(/\{iso\}/g, exif.iso ? String(exif.iso) : "");
  result = result.replace(/\{focal\}/g, exif.focalLength ? `${exif.focalLength}mm` : "");
  result = result.replace(/\{width\}/g, exif.width ? String(exif.width) : "");
  result = result.replace(/\{height\}/g, exif.height ? String(exif.height) : "");
  result = result.replace(/\{name\}/g, originalName);
  result = result.replace(/\{i\}/g, padNum(index, 3));

  return result + ext;
}

interface Preview {
  original: string;
  renamed: string;
}

function PreviewList({ folderPath, previews }: { folderPath: string; previews: Preview[] }) {
  const { pop } = useNavigation();

  async function executeRename() {
    const confirmed = await confirmAlert({
      title: `Rename ${previews.length} files?`,
      message: "This will rename the files as shown in the preview.",
      primaryAction: { title: "Rename" },
    });
    if (!confirmed) return;

    try {
      const changes = previews.filter((p) => p.original !== p.renamed);
      for (const p of changes) {
        await fsRename(join(folderPath, p.original), join(folderPath, p.renamed));
      }
      await saveUndoState({ folderPath, changes, actionName: "EXIF Rename", timestamp: Date.now() });
      await showToast({ style: Toast.Style.Success, title: `Renamed ${changes.length} files` });
      pop();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: String(error) });
    }
  }

  return (
    <List navigationTitle="EXIF Rename Preview">
      {previews.map((p) => (
        <List.Item
          key={p.original}
          title={p.renamed}
          subtitle={p.original !== p.renamed ? `← ${p.original}` : "unchanged"}
          icon={p.original !== p.renamed ? { source: Icon.ArrowRight, tintColor: Color.Green } : Icon.Minus}
          actions={
            <ActionPanel>
              <Action title="Rename All" icon={Icon.Check} onAction={executeRename} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function ExifRename() {
  const { push } = useNavigation();
  const [folder, setFolder] = useState("");
  const [template, setTemplate] = useState("{date}_{i}");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD_HH-MM-SS");

  useEffect(() => {
    (async () => {
      const f = await getFinderFolder();
      if (f) setFolder(f);
    })();
  }, []);

  async function onSubmit() {
    if (!folder) {
      await showToast({ style: Toast.Style.Failure, title: "Open a Finder window first" });
      return;
    }

    const entries = await readdir(folder);
    const imageFiles: string[] = [];
    for (const e of entries) {
      if (e.startsWith(".")) continue;
      const ext = extname(e).toLowerCase();
      if (!IMAGE_EXTS.has(ext)) continue;
      const s = await stat(join(folder, e));
      if (s.isFile()) imageFiles.push(e);
    }

    if (imageFiles.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No image files found in folder" });
      return;
    }

    // Sort by EXIF date if available, then by name
    const withExif = await Promise.all(
      imageFiles.map(async (f) => ({
        name: f,
        exif: await extractExif(join(folder, f)),
      })),
    );
    withExif.sort((a, b) => {
      const da = a.exif?.dateTaken?.getTime() ?? Infinity;
      const db = b.exif?.dateTaken?.getTime() ?? Infinity;
      if (da !== db) return da - db;
      return a.name.localeCompare(b.name);
    });

    const previews: Preview[] = withExif.map((item, i) => ({
      original: item.name,
      renamed: buildExifName(item.name, item.exif ?? {}, i + 1, template, dateFormat),
    }));

    push(<PreviewList folderPath={folder} previews={previews} />);
  }

  return (
    <Form
      navigationTitle="Rename Photos by EXIF"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Preview" icon={Icon.Eye} onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Folder" text={folder ? basename(folder) : "Detecting..."} />
      <Form.TextField
        id="template"
        title="Template"
        placeholder="{date}_{i}"
        value={template}
        onChange={setTemplate}
        info="Placeholders: {date}, {make}, {model}, {iso}, {focal}, {width}, {height}, {name}, {i} (index)"
      />
      <Form.Dropdown id="dateFormat" title="Date Format" value={dateFormat} onChange={setDateFormat}>
        <Form.Dropdown.Item value="YYYY-MM-DD_HH-MM-SS" title="2026-03-31_14-30-00" />
        <Form.Dropdown.Item value="YYYY-MM-DD" title="2026-03-31" />
        <Form.Dropdown.Item value="YYYYMMDD" title="20260331" />
        <Form.Dropdown.Item value="DD-MM-YYYY" title="31-03-2026" />
      </Form.Dropdown>
      <Form.Description
        title="Preview"
        text={(() => {
          let result = template || "{date}_{i}";
          result = result.replace(/\{date\}/g, "2026-03-31_14-30-00");
          result = result.replace(/\{make\}/g, "Canon");
          result = result.replace(/\{model\}/g, "EOS R5");
          result = result.replace(/\{iso\}/g, "400");
          result = result.replace(/\{focal\}/g, "85mm");
          result = result.replace(/\{width\}/g, "8192");
          result = result.replace(/\{height\}/g, "5464");
          result = result.replace(/\{name\}/g, "DSC_0001");
          result = result.replace(/\{i\}/g, "001");
          return `${result}.jpg`;
        })()}
      />
    </Form>
  );
}
