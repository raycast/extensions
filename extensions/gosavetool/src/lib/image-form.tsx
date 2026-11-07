import {
  Action,
  ActionPanel,
  environment,
  Form,
  getSelectedFinderItems,
  Icon,
  open,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { convert, EXT, Format, kb, sniff } from "./image";
import { toolUrl } from "./site";

type Target = Format | "same";

interface Values {
  files: string[];
  format: Target;
  quality: string;
  maxWidth: string;
}

const READABLE = /\.(png|jpe?g|webp)$/i;

async function selectedImages(): Promise<string[]> {
  try {
    return (await getSelectedFinderItems()).map((f) => f.path).filter((p) => READABLE.test(p));
  } catch {
    return []; // the file manager is not in front
  }
}

/** photo.png → photo-gosavetool.webp, then photo-gosavetool-2.webp if that is taken */
function outPath(file: string, ext: string): string {
  const base = join(dirname(file), basename(file, extname(file)) + "-gosavetool");
  let p = `${base}.${ext}`;
  for (let i = 2; existsSync(p); i++) p = `${base}-${i}.${ext}`;
  return p;
}

export function ImageForm({ defaultFormat, onlineTool }: { defaultFormat: Target; onlineTool: string }) {
  const { data: selected, isLoading } = usePromise(selectedImages);

  async function submit(v: Values) {
    const files = v.files.filter((f) => READABLE.test(f));
    if (!files.length) {
      await showToast({ style: Toast.Style.Failure, title: "Choose PNG, JPG or WebP files" });
      return;
    }
    const quality = Math.min(100, Math.max(1, Number(v.quality) || 75));
    const maxWidth = Math.max(0, Math.floor(Number(v.maxWidth) || 0));
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Processing ${files.length} image${files.length > 1 ? "s" : ""}`,
    });
    let before = 0,
      after = 0,
      last = "";
    try {
      for (const [i, file] of files.entries()) {
        toast.message = `${i + 1} of ${files.length}: ${basename(file)}`;
        const input = new Uint8Array(readFileSync(file));
        const to = v.format === "same" ? sniff(input) : v.format;
        if (!to) throw new Error(`${basename(file)} is not a PNG, JPG or WebP file`);
        const r = await convert(join(environment.assetsPath, "wasm"), input, to, quality, maxWidth);
        last = outPath(file, EXT[to]);
        writeFileSync(last, r.data);
        before += input.length;
        after += r.data.length;
      }
      const saved = Math.round((1 - after / before) * 100);
      toast.style = Toast.Style.Success;
      toast.title =
        saved > 0 ? `${saved}% smaller · ${kb(before)} → ${kb(after)}` : `Done · ${kb(before)} → ${kb(after)}`;
      toast.message = files.length > 1 ? `${files.length} files saved next to the originals` : basename(last);
      const file = last;
      toast.primaryAction = { title: "Show in Folder", onAction: () => showInFinder(file) };
      toast.secondaryAction = { title: "Open Image", onAction: () => open(file) };
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not process the image";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Images" icon={Icon.Image} onSubmit={submit} />
          <Action.OpenInBrowser title="Open Online Tool" url={toolUrl(onlineTool)} />
        </ActionPanel>
      }
    >
      {isLoading ? null : <Form.FilePicker id="files" title="Images" allowMultipleSelection defaultValue={selected} />}
      <Form.Dropdown id="format" title="Save As" defaultValue={defaultFormat}>
        <Form.Dropdown.Item value="same" title="Same Format" />
        <Form.Dropdown.Item value="webp" title="WebP" />
        <Form.Dropdown.Item value="jpg" title="JPG" />
        <Form.Dropdown.Item value="png" title="PNG (Lossless)" />
      </Form.Dropdown>
      <Form.Dropdown
        id="quality"
        title="Quality"
        defaultValue="75"
        info="Used for WebP and JPG. PNG stays lossless and is optimized instead."
      >
        {["90", "80", "75", "60", "40"].map((q) => (
          <Form.Dropdown.Item key={q} value={q} title={q} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="maxWidth"
        title="Max Width"
        placeholder="Keep size"
        info="In pixels. Wider images are scaled down, keeping the aspect ratio."
      />
      <Form.Description text="Files are saved next to the originals with -gosavetool in the name. Everything runs on this computer." />
    </Form>
  );
}
