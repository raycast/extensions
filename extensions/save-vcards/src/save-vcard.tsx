// "Save vCard from Clipboard", and the screen the other two commands open.
// Reads what it was given (text or a captured image) or, launched directly, the clipboard:
// text first, then a copied image such as a business-card photo from an iPhone.
import { Clipboard, Detail, LaunchProps } from "@raycast/api";
import path from "node:path";
import { useEffect, useRef, useState } from "react";
import { ContactForm } from "./components/ContactForm";
import { ResultView } from "./components/ResultView";
import {
  isImageFile,
  keepCopy,
  newCapturePath,
  pruneCaptures,
  toPath,
} from "./core/captures";
import {
  EMPTY_DRAFT,
  stateFromDraft,
  type LaunchContext,
} from "./core/contact";
import { log } from "./core/log";
import type { ContactDraft } from "./core/parse";
import { readContact, readImage } from "./core/read";
import { clipboardImage } from "./native";

type Problem = { title: string; message: string };
type Loaded =
  | { text: string; image?: string; draft: ContactDraft }
  | { empty: true; problem?: Problem };

async function fromClipboard(): Promise<{
  text: string;
  image?: string;
  problem?: Problem;
}> {
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

export default function Command(
  props: LaunchProps<{ launchContext?: LaunchContext }>,
) {
  const ctx = props.launchContext ?? {};
  const [loaded, setLoaded] = useState<Loaded>();
  const [problem, setProblem] = useState<Problem>();
  const started = useRef(false);

  useEffect(() => {
    // React runs effects twice in development; reading must happen once.
    if (started.current || ctx.restore) return;
    started.current = true;
    pruneCaptures();
    (async () => {
      log("input", `open from ${ctx.source ?? "direct launch"}`);
      try {
        let text = ctx.text ?? "";
        let image = ctx.image;
        let clipboardProblem: Problem | undefined;
        if (image && !text) text = await readImage(image);
        if (!text && !image)
          ({ text, image, problem: clipboardProblem } = await fromClipboard());
        if (!text.trim()) {
          setLoaded({ empty: true, problem: clipboardProblem });
          return;
        }
        setLoaded({ text, image, draft: await readContact(text) });
      } catch (err) {
        log("input", "could not read input", err);
        setProblem({ title: "Could not read the input", message: String(err) });
      }
    })();
  }, []);

  // A save failed after the window closed: back to the form with every edit intact.
  if (ctx.restore)
    return (
      <ContactForm
        initial={ctx.restore}
        text={ctx.text ?? ""}
        error={
          ctx.error ? { title: "Not saved", message: ctx.error } : undefined
        }
      />
    );
  if (problem)
    return (
      <ContactForm
        initial={stateFromDraft(EMPTY_DRAFT)}
        text=""
        error={problem}
      />
    );
  if (!loaded) return <Detail isLoading markdown="" />;
  if ("empty" in loaded)
    return (
      <ContactForm
        initial={stateFromDraft(EMPTY_DRAFT)}
        text=""
        error={loaded.problem}
      />
    );
  return (
    <ResultView text={loaded.text} image={loaded.image} draft={loaded.draft} />
  );
}
