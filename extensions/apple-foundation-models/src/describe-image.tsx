import {
  Action,
  ActionPanel,
  Detail,
  environment,
  Form,
  Icon,
  LaunchProps,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { rm } from "node:fs/promises";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";
import { useEffect, useRef, useState } from "react";
import { ResultView } from "./components/ResultView";
import { removeOldClipboardImages, saveClipboardImage } from "./lib/clipboard-image";
import { BuiltInTool, respond } from "./lib/fm";
import { isImageFile } from "./lib/images";
import { latestScreenshot } from "./lib/screenshots";
import { findClipboardImage, findFinderImage, findImageInput, ImageInput, imageOriginLabels } from "./lib/sources";
import { getWorkDirectory } from "./lib/storage";

const DEFAULT_QUESTION = "Describe this image.";

// Without these, the model tends to paraphrase what the tools read instead of giving it exactly.
const TOOL_INSTRUCTIONS: Record<BuiltInTool, string> = {
  ocr: "When you read text in the image, quote it exactly.",
  barcode: "When you read a barcode or QR code, give its exact content.",
};

interface ImageFile {
  path: string;
  /** Saved from the clipboard for this answer, so it is removed when the answer closes. */
  temporary: boolean;
}

/** Image data on the clipboard is saved to a file only now, when it is used. */
async function toImageFile(input: ImageInput): Promise<ImageFile | undefined> {
  if (input.path) return { path: input.path, temporary: false };
  const saved = await saveClipboardImage(getWorkDirectory()).catch(() => undefined);
  return saved ? { path: saved, temporary: true } : undefined;
}

function ImageAnswer({ image, question, tools }: { image: ImageFile; question: string; tools: BuiltInTool[] }) {
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (!image.temporary) return;
      const remove = () => rm(image.path, { force: true });
      // React runs effects twice in development, so there only remove the file when the view really closed.
      // Files left behind when Raycast quits are removed an hour later by removeOldClipboardImages.
      if (!environment.isDevelopment) remove();
      else
        setTimeout(() => {
          if (!isMounted.current) remove();
        }, 0);
    };
  }, []);

  const name = image.temporary ? "Clipboard Image" : basename(image.path);
  return (
    <ResultView
      navigationTitle={name}
      header={`> ${question}`}
      footer={`![${name}](${pathToFileURL(image.path).href}?raycast-width=320&raycast-height=200)`}
      task={(runOptions) =>
        respond(
          {
            prompt: question,
            images: [image.path],
            tools,
            instructions: tools.map((tool) => TOOL_INSTRUCTIONS[tool]).join(" "),
          },
          runOptions,
        )
      }
    />
  );
}

interface FormValues {
  question: string;
  ocr: boolean;
  barcode: boolean;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.DescribeImage }>) {
  const { push } = useNavigation();
  const argumentQuestion = props.arguments.question?.trim() ?? "";
  const [image, setImage] = useState<ImageInput>();
  const [source, setSource] = useState<string>();
  const [isDetecting, setIsDetecting] = useState(true);
  const [directAnswer, setDirectAnswer] = useState<ImageFile>();
  const started = useRef(false);
  // Set once the user chooses an image, so the detection that runs on open does not replace it.
  const userChose = useRef(false);

  const use = (input: ImageInput, label = `Using ${imageOriginLabels[input.origin]}.`) => {
    setImage(input);
    setSource(label);
  };
  const choose = (input: ImageInput, label?: string) => {
    userChose.current = true;
    use(input, label);
  };

  useEffect(() => {
    // Detect once, also when React runs effects twice in development.
    if (started.current) return;
    started.current = true;
    removeOldClipboardImages(getWorkDirectory());
    (async () => {
      const found = await findImageInput();
      if (found && !userChose.current) {
        use(found);
        // With a question as the argument, answer right away instead of showing the form.
        const file = argumentQuestion ? await toImageFile(found) : undefined;
        if (file) setDirectAnswer(file);
      }
      setIsDetecting(false);
    })();
  }, []);

  async function pick(finder: () => Promise<ImageInput | undefined>, missing: string) {
    const found = await finder().catch(() => undefined);
    if (!found) {
      await showToast({ style: Toast.Style.Failure, title: missing });
      return;
    }
    choose(found);
  }

  async function pickLatestScreenshot() {
    const path = await latestScreenshot().catch(() => undefined);
    if (!path) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No screenshot found",
        message: "Take one with ⇧⌘4 first.",
      });
      return;
    }
    choose({ path, origin: "file" }, `Using your latest screenshot, ${basename(path)}.`);
  }

  async function submit(values: FormValues) {
    if (!image) {
      await showToast({ style: Toast.Style.Failure, title: "Choose an image first" });
      return;
    }
    if (image.path && !isImageFile(image.path)) {
      await showToast({ style: Toast.Style.Failure, title: "This file is not a supported image" });
      return;
    }
    const file = await toImageFile(image);
    if (!file) {
      await showToast({ style: Toast.Style.Failure, title: "The clipboard no longer has an image" });
      return;
    }
    const tools: BuiltInTool[] = [];
    if (values.ocr) tools.push("ocr");
    if (values.barcode) tools.push("barcode");
    push(<ImageAnswer image={file} question={values.question.trim() || DEFAULT_QUESTION} tools={tools} />);
  }

  if (directAnswer) {
    return <ImageAnswer image={directAnswer} question={argumentQuestion} tools={[]} />;
  }
  if (isDetecting && argumentQuestion) {
    return <Detail isLoading navigationTitle="Describe Image" markdown="" />;
  }

  return (
    <Form
      isLoading={isDetecting}
      navigationTitle="Describe Image"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask About Image" icon={Icon.Image} onSubmit={submit} />
          <Action
            title="Use Clipboard Image"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={() => pick(findClipboardImage, "No image on the clipboard")}
          />
          <Action
            title="Use Selected Finder Image"
            icon={Icon.Finder}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            onAction={() => pick(findFinderImage, "No image selected in Finder")}
          />
          <Action
            title="Use Latest Screenshot"
            icon={Icon.Camera}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            onAction={pickLatestScreenshot}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="image"
        title="Image"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        value={image?.path ? [image.path] : []}
        onChange={(paths) => {
          if (paths[0]) {
            choose({ path: paths[0], origin: "file" }, "");
          } else if (image?.path) {
            setImage(undefined);
            setSource(undefined);
          }
        }}
        info="An image selected in Finder or copied to the clipboard is picked up when the command opens. ⌘⇧V uses the clipboard, ⌘⇧F the Finder selection and ⌘L your latest screenshot."
      />
      {source && <Form.Description text={source} />}
      <Form.TextArea
        id="question"
        title="Question"
        placeholder={DEFAULT_QUESTION}
        defaultValue={argumentQuestion}
        // The image is usually found already, so typing the question is the next step.
        autoFocus
      />
      <Form.Checkbox id="ocr" label="Read text in the image" defaultValue={false} />
      <Form.Checkbox id="barcode" label="Read barcodes and QR codes" defaultValue={false} />
    </Form>
  );
}
