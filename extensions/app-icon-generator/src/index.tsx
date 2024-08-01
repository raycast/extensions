import React, { useState } from "react";
import { Action, ActionPanel, Form, showToast, Toast, open, popToRoot } from "@raycast/api";
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
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleSubmit(values: FormValues) {
    if (isProcessing) return;

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

    setIsProcessing(true);
    await processImage(imagePath, values.platforms);
    setIsProcessing(false);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Icons" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isProcessing}
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

async function processImage(imagePath: string, platforms: string[]) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Generating Icons",
    message: "Processing...",
  });

  try {
    const parentDir = dirname(imagePath);
    const baseFileName = basename(imagePath, extname(imagePath));
    const outputDir = join(parentDir, `${baseFileName}_icons`);
    await fs.mkdir(outputDir, { recursive: true });

    const buffer = await fs.readFile(imagePath);
    const image = await Jimp.read(buffer);

    for (const platform of platforms) {
      toast.message = `Generating ${PLATFORMS[platform as keyof typeof PLATFORMS]} icons...`;
      const platformDir = join(outputDir, platform);
      await fs.mkdir(platformDir, { recursive: true });

      if (platform === "ico") {
        await generateIcoIcon(image, platformDir);
      } else {
        await generatePlatformIcons(image, platform as keyof typeof SIZES, platformDir);
      }
    }

    toast.style = Toast.Style.Success;
    toast.title = "Icons Generated Successfully!";
    toast.message = `The generated folder will be opened. Icons saved in: ${outputDir}`;

    setTimeout(() => {
      open(outputDir);
      popToRoot();
    }, 1000);
  } catch (error) {
    console.error("Error:", error);
    toast.style = Toast.Style.Failure;
    toast.title = "Error Occurred";
    toast.message = "Failed to generate icons. Please try again.";
  }
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
