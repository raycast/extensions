import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";
import {
  createOutputDirectory,
  getImageOutputFiles,
  ImageOutput,
  ImageOutputResult,
  ImageResults,
} from "./utils/image-output";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";

import { DelphitoolsRequired } from "./delphitools-install";

type FormValues = {
  images: string[];
  mark: string[];
  position: string;
  opacity: string;
  scale: string;
};

type WatermarkOutput = ImageOutput;
type WatermarkResult = ImageOutputResult<WatermarkOutput>;

const OUTPUT_NAMESPACE = "watermark";
const DEFAULT_POSITION = "bottom-right";
const DEFAULT_OPACITY = "0.3";
const DEFAULT_SCALE = "0.2";

const POSITIONS = [
  { label: "Bottom Right", value: "bottom-right" },
  { label: "Bottom", value: "bottom" },
  { label: "Bottom Left", value: "bottom-left" },
  { label: "Right", value: "right" },
  { label: "Center", value: "center" },
  { label: "Left", value: "left" },
  { label: "Top Right", value: "top-right" },
  { label: "Top", value: "top" },
  { label: "Top Left", value: "top-left" },
];

export default function Command() {
  return (
    <DelphitoolsRequired>
      {({ isCheckingInstall }) => (
        <WatermarkForm isCheckingInstall={isCheckingInstall} />
      )}
    </DelphitoolsRequired>
  );
}

function WatermarkForm({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const { push } = useNavigation();

  return (
    <Form
      isLoading={isCheckingInstall}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            icon={Icon.Image}
            title="Apply Watermark"
            onSubmit={async (values) => {
              const validationError = validateFormValues(values);

              if (validationError) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: validationError.title,
                  message: validationError.message,
                });
                return;
              }

              try {
                await showToast({
                  style: Toast.Style.Animated,
                  title: "Applying watermark to images...",
                });

                const result = await runWatermark(values);

                await showToast({
                  style: Toast.Style.Success,
                  title: "Watermark applied",
                  message: `${result.outputs.length} image${
                    result.outputs.length === 1 ? "" : "s"
                  } processed.`,
                });

                push(<WatermarkResults result={result} />);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error);

                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not apply watermark",
                  message,
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="images"
        title="Images"
        allowMultipleSelection
        canChooseDirectories={false}
      />
      <Form.FilePicker
        id="mark"
        title="Watermark"
        allowMultipleSelection={false}
        canChooseDirectories={false}
      />
      <Form.Dropdown
        id="position"
        title="Position"
        defaultValue={DEFAULT_POSITION}
      >
        {POSITIONS.map((pos) => (
          <Form.Dropdown.Item
            key={pos.value}
            title={pos.label}
            value={pos.value}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="opacity"
        title="Opacity"
        defaultValue={DEFAULT_OPACITY}
        placeholder="0.0 to 1.0"
      />
      <Form.TextField
        id="scale"
        title="Scale"
        defaultValue={DEFAULT_SCALE}
        placeholder="0.0 to 1.0"
      />
      <Form.Description text="You can select multiple images. Watermarking is done locally and safely." />
    </Form>
  );
}

function WatermarkResults({ result }: { result: WatermarkResult }) {
  return (
    <ImageResults
      result={result}
      searchBarPlaceholder="Search watermarked images"
      openTitle="Open Watermarked Image"
      copyImageTitle="Copy Watermarked Image"
      copyImagePathTitle="Copy Image Path"
      copiedImageTitle="Copied Watermarked Image"
    />
  );
}

async function runWatermark(values: FormValues): Promise<WatermarkResult> {
  const outputDirectory = await createOutputDirectory(OUTPUT_NAMESPACE);

  const args = [
    "watermark",
    "--mark",
    values.mark[0],
    "--quiet",
    "--output",
    outputDirectory,
    ...values.images,
  ];

  const position = values.position;
  if (position) {
    args.push("--position", position);
  }

  const opacity = values.opacity.trim();
  if (opacity) {
    args.push("--opacity", opacity);
  }

  const scale = values.scale.trim();
  if (scale) {
    args.push("--scale", scale);
  }

  await execFileAsync(getDelphitoolsCliPath(), args);

  const outputs = await getImageOutputFiles(outputDirectory);

  if (outputs.length === 0) {
    throw new Error("No watermarked images were generated.");
  }

  return {
    outputDirectory,
    outputs,
    outputPaths: outputs.map((out) => out.path),
  };
}

function validateFormValues(values: FormValues): {
  title: string;
  message?: string;
} | null {
  if (!values.images?.length) {
    return { title: "Choose at least one image" };
  }

  if (!values.mark?.length) {
    return { title: "Choose a watermark image" };
  }

  const opacityStr = values.opacity.trim();
  if (!opacityStr) {
    return { title: "Opacity is required" };
  }
  const opacity = Number(opacityStr);
  if (isNaN(opacity) || opacity < 0.0 || opacity > 1.0) {
    return {
      title: "Opacity must be between 0.0 and 1.0",
      message: "Enter a number between 0.0 and 1.0.",
    };
  }

  const scaleStr = values.scale.trim();
  if (!scaleStr) {
    return { title: "Scale is required" };
  }
  const scale = Number(scaleStr);
  if (isNaN(scale) || scale < 0.0 || scale > 1.0) {
    return {
      title: "Scale must be between 0.0 and 1.0",
      message: "Enter a number between 0.0 and 1.0.",
    };
  }

  return null;
}
