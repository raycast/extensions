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
import { useEffect, useState } from "react";

import {
  DelphitoolsInstallStatusView,
  getDelphitoolsInstallStatus,
} from "./delphitools-install";

type FormValues = {
  images: string[];
  opacity: string;
  scale: string;
  seed: string;
};

type NoiseOutput = ImageOutput;
type NoiseResult = ImageOutputResult<NoiseOutput>;

const OUTPUT_NAMESPACE = "noise";
const DEFAULT_OPACITY = "0.15";
const DEFAULT_SCALE = "1.0";

export default function Command() {
  const [isDelphitoolsInstalled, setIsDelphitoolsInstalled] =
    useState<boolean>();

  useEffect(() => {
    async function checkInstallStatus() {
      const status = await getDelphitoolsInstallStatus();
      setIsDelphitoolsInstalled(status.installed);
    }

    checkInstallStatus();
  }, []);

  if (isDelphitoolsInstalled === false) {
    return <DelphitoolsInstallStatusView status={{ installed: false }} />;
  }

  return <NoiseForm isCheckingInstall={isDelphitoolsInstalled === undefined} />;
}

function NoiseForm({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const { push } = useNavigation();

  return (
    <Form
      isLoading={isCheckingInstall}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            icon={Icon.Image}
            title="Add Noise to Images"
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
                  title: "Adding noise to images...",
                });

                const result = await runNoise(values);

                await showToast({
                  style: Toast.Style.Success,
                  title: "Noise added",
                  message: `${result.outputs.length} image${
                    result.outputs.length === 1 ? "" : "s"
                  } processed.`,
                });

                push(<NoiseResults result={result} />);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error);

                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not add noise to images",
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
        placeholder="Greater than 0 (e.g., 1.0)"
      />
      <Form.TextField
        id="seed"
        title="Seed"
        placeholder="Optional (random by default)"
      />
      <Form.Description text="You can select multiple images. Noise overlay is added locally and safely." />
    </Form>
  );
}

function NoiseResults({ result }: { result: NoiseResult }) {
  return (
    <ImageResults
      result={result}
      searchBarPlaceholder="Search processed images"
      openTitle="Open Noisy Image"
      copyImageTitle="Copy Noisy Image"
      copyImagePathTitle="Copy Noisy Image Path"
      copiedImageTitle="Copied Noisy Image"
    />
  );
}

async function runNoise(values: FormValues): Promise<NoiseResult> {
  const outputDirectory = await createOutputDirectory(OUTPUT_NAMESPACE);

  const args = [
    "noise",
    "--quiet",
    "--output",
    outputDirectory,
    ...values.images,
  ];

  const opacity = values.opacity.trim();
  if (opacity) {
    args.push("--opacity", opacity);
  }

  const scale = values.scale.trim();
  if (scale) {
    args.push("--scale", scale);
  }

  const seed = values.seed.trim();
  if (seed) {
    args.push("--seed", seed);
  }

  await execFileAsync(getDelphitoolsCliPath(), args);

  const outputs = await getImageOutputFiles(outputDirectory);

  if (outputs.length === 0) {
    throw new Error("No noisy images were generated.");
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
  if (isNaN(scale) || scale <= 0) {
    return {
      title: "Scale must be greater than 0",
      message: "Enter a number greater than 0.",
    };
  }

  return null;
}
