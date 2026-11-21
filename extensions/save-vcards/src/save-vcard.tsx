// "Save vCard from Clipboard", and the screen the other two commands open.
// Reads what it was given (text or a captured image) or, launched directly, the clipboard:
// text first, then a copied image such as a business-card photo from an iPhone.
import { Clipboard, Detail, LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import path from "node:path";
import { ContactForm } from "./components/ContactForm";
import { ResultView } from "./components/ResultView";
import { isImageFile, keepCopy, newCapturePath, pruneCaptures, toPath } from "./core/captures";
import { EMPTY_DRAFT, stateFromDraft, type LaunchContext } from "./core/contact";
import { log } from "./core/log";
import type { ContactDraft } from "./core/parse";
import { readContact, readImage } from "./core/read";
import { clipboardImage } from "./native";

type Problem = { title: string; message: string };
type Input = { text: string; image?: string; problem?: Problem };
type Loaded = {
  text: string;
  image?: string;
  draft?: ContactDraft;
  problem?: Problem;
};

async function fromClipboard(): Promise<Input> {
  const content = await Clipboard.read();
  if (content.file) {
    const file = toPath(content.file);
    if (!isImageFile(file)) {
      // Finder also puts the file's name on the clipboard as text; that is not a contact.
      log("input", "clipboard holds a non-image file");
      return {
        text: "",
        problem: {
          title: "The copied file is not an image",
          message: `${path.basename(file)}: copy a photo of a card, or text.`,
        },
      };
    }
    const image = keepCopy(file);
    log("input", "clipboard image file");
    return { text: await readImage(image), image };
  }
  if (content.text?.trim()) {
    log("input", `clipboard text: ${content.text.length} chars`);
    return { text: content.text };
  }
  const image = newCapturePath();
  if (await clipboardImage(image)) {
    log("input", "clipboard image data");
    return { text: await readImage(image), image };
  }
  log("input", "clipboard empty");
  return { text: "" };
}

async function load(ctx: LaunchContext): Promise<Loaded> {
  pruneCaptures();
  log("input", `open from ${ctx.source ?? "direct launch"}`);
  let input: Input = { text: ctx.text ?? "", image: ctx.image };
  if (input.image && !input.text) input.text = await readImage(input.image);
  if (!input.text && !input.image) input = await fromClipboard();
  if (!input.text.trim()) return { ...input };
  return { ...input, draft: await readContact(input.text) };
}

export default function Command(props: LaunchProps<{ launchContext?: LaunchContext }>) {
  const { data, isLoading, error } = usePromise(load, [props.launchContext ?? {}], {
    failureToastOptions: { title: "Could not read the input" },
  });

  if (isLoading || (!data && !error)) return <Detail isLoading markdown="" />;
  if (!data?.draft) {
    return <ContactForm initial={stateFromDraft(EMPTY_DRAFT)} text="" error={data?.problem} />;
  }
  return <ResultView text={data.text} image={data.image} draft={data.draft} />;
}
