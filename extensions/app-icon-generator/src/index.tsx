import React, { useState } from "react";
import {
  Action,
  ActionPanel,
  Detail,
  Form,
  useNavigation,
  showToast,
  Toast,
  open,
  popToRoot,
  Icon,
} from "@raycast/api";
import Jimp from "jimp";
import pngToIco from "png-to-ico";
import { join, dirname, basename, extname } from "path";
import fs from "fs/promises";

interface FormValues {
  imagePath: string[];
  platforms: string[];
}

const PLATFORMS = {
  ico: "ICO",
  ios: "iOS",
  ipad: "iPad",
  macos: "macOS",
};

const SIZES = {
  ico: [16, 24, 32, 48, 64, 128, 256],
  ios: [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024],
  ipad: [20, 29, 40, 58, 76, 80, 87, 120, 152, 167, 180, 1024],
  macos: [16, 32, 64, 128, 256, 512, 1024],
};

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"];

export default function Command() {
  const { push } = useNavigation();

  async function handleSubmit(values: FormValues) {
    if (!values.imagePath || values.imagePath.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No file selected",
        message: "Please select an image file",
      });
      return;
    }

    const imagePath = values.imagePath[0];
    const fileExtension = extname(imagePath).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid file type",
        message: "Please select a valid image file (jpg, jpeg, png)",
      });
      return;
    }

    if (!values.platforms || values.platforms.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No platform selected",
        message: "Please select at least one platform",
      });
      return;
    }

    push(<ProcessingView imagePath={imagePath} platforms={values.platforms} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Icons" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="imagePath" title="Select Image" allowMultipleSelection={false} />
      <Form.TagPicker id="platforms" title="Select Platforms">
        {Object.entries(PLATFORMS).map(([key, value]) => (
          <Form.TagPicker.Item key={key} value={key} title={value} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

function ProcessingView({ imagePath, platforms }: { imagePath: string; platforms: string[] }) {
  const [status, setStatus] = useState<string>("Processing");
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const [outputDir, setOutputDir] = useState<string | null>(null);

  React.useEffect(() => {
    processImage(imagePath, platforms);
  }, []);

  async function processImage(imagePath: string, platforms: string[]) {
    try {
      const parentDir = dirname(imagePath);
      const baseFileName = basename(imagePath, extname(imagePath));
      const outputDir = join(parentDir, `${baseFileName}_icons`);
      await fs.mkdir(outputDir, { recursive: true });
      setOutputDir(outputDir);

      const buffer = await fs.readFile(imagePath);
      const image = await Jimp.read(buffer);

      for (const platform of platforms) {
        const platformDir = join(outputDir, platform);
        await fs.mkdir(platformDir, { recursive: true });

        if (platform === "ico") {
          await generateIcoIcon(image, platformDir);
        } else {
          await generatePlatformIcons(image, platform as keyof typeof SIZES, platformDir);
        }
      }

      setStatus("Complete");
    } catch (error) {
      console.error("Error:", error);
      setStatus("Error");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleOpenOutputFolder(outputDir: string) {
    open(outputDir);
    setTimeout(() => {
      popToRoot();
    }, 1000);
  }

  const getMarkdown = () => {
    if (isProcessing) {
      return `
# Generating Icons ⏳

Please wait...
      `;
    }
    if (status === "Complete") {
      return `
# Icons Generated Successfully! 🎉

Icons are saved in:

\`${outputDir}\`

Use the action below to open the output folder.
      `;
    }
    if (status === "Error") {
      return `
# Error Occurred 😕

Failed to generate icons. Please try again.
      `;
    }
    return "# Unexpected State";
  };

  return (
    <Detail
      markdown={getMarkdown()}
      actions={
        <ActionPanel>
          {!isProcessing && outputDir && status === "Complete" && (
            <Action title="Open Output Folder" icon={Icon.Folder} onAction={() => handleOpenOutputFolder(outputDir)} />
          )}
          <Action title="Back to Main" icon={Icon.ArrowLeft} onAction={() => popToRoot()} />
        </ActionPanel>
      }
    />
  );
}

async function generateIcoIcon(image: Jimp, outputDir: string) {
  const sizes = SIZES.ico;
  const pngBuffers = await Promise.all(
    sizes.map(async (size) => {
      const resized = await image.clone().resize(size, size);
      return resized.getBufferAsync(Jimp.MIME_PNG);
    }),
  );

  try {
    const icoBuffer = await pngToIco(pngBuffers);
    await fs.writeFile(join(outputDir, "icon.ico"), icoBuffer);
    console.log(`Generated multi-size ICO icon (sizes: ${sizes.join(", ")})`);
  } catch (error) {
    console.error("Error generating ICO:", error);
    throw error;
  }
}

async function generatePlatformIcons(image: Jimp, platform: keyof typeof SIZES, outputDir: string) {
  const sizes = SIZES[platform];
  await Promise.all(
    sizes.map(async (size) => {
      const resized = await image.clone().resize(size, size);
      const fileName = `icon_${size}x${size}.png`;
      await resized.writeAsync(join(outputDir, fileName));
      console.log(`Generated ${platform} icon: ${fileName}`);
    }),
  );
}
