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
  LocalStorage,
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
};

type RmbgOutput = ImageOutput;
type RmbgResult = ImageOutputResult<RmbgOutput>;

const OUTPUT_NAMESPACE = "rmbg";
const FIRST_RUN_KEY = "rmbg-has-run";

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

  return <RmbgForm isCheckingInstall={isDelphitoolsInstalled === undefined} />;
}

function RmbgForm({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const { push } = useNavigation();

  return (
    <Form
      isLoading={isCheckingInstall}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            icon={Icon.Image}
            title="Remove Background"
            onSubmit={async (values) => {
              const images = values.images ?? [];

              if (images.length === 0) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Choose at least one image",
                });
                return;
              }

              try {
                const hasRunBefore =
                  await LocalStorage.getItem<boolean>(FIRST_RUN_KEY);
                const toastTitle = hasRunBefore
                  ? "Removing background..."
                  : "Removing background (Downloading model on first run)...";

                await showToast({
                  style: Toast.Style.Animated,
                  title: toastTitle,
                });

                const result = await runRmbg(images);

                await LocalStorage.setItem(FIRST_RUN_KEY, true);

                await showToast({
                  style: Toast.Style.Success,
                  title: "Background removed",
                  message: `${result.outputs.length} image${
                    result.outputs.length === 1 ? "" : "s"
                  } processed.`,
                });

                push(<RmbgResults result={result} />);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error);

                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not remove background",
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
      <Form.Description text="Background removal is processed locally and safely. Warning: The first use will download a ~170 MB background-removal model, which may take a moment." />
    </Form>
  );
}

function RmbgResults({ result }: { result: RmbgResult }) {
  return (
    <ImageResults
      result={result}
      searchBarPlaceholder="Search processed images"
      openTitle="Open Image"
      copyImageTitle="Copy Image"
      copyImagePathTitle="Copy Image Path"
      copiedImageTitle="Copied Image"
    />
  );
}

async function runRmbg(images: string[]): Promise<RmbgResult> {
  const outputDirectory = await createOutputDirectory(OUTPUT_NAMESPACE);

  const args = [
    "rmbg",
    "--approve",
    "--quiet",
    "--output",
    outputDirectory,
    ...images,
  ];

  await execFileAsync(getDelphitoolsCliPath(), args);

  const outputs = await getImageOutputFiles(outputDirectory);

  if (outputs.length === 0) {
    throw new Error("No processed images were generated.");
  }

  return {
    outputDirectory,
    outputs,
    outputPaths: outputs.map((out) => out.path),
  };
}
