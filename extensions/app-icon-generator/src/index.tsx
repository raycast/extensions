import {
  Action,
  ActionPanel,
  Form,
  useNavigation,
  showHUD,
  showToast,
  Toast,
  open,
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
        message: "Please select a valid image file (jpg, jpeg, png, gif, or bmp)",
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

    push(<ProcessImage imagePath={values.imagePath[0]} platforms={values.platforms} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Icons" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="imagePath"
        title="Select Image"
        allowMultipleSelection={false}
      />
      <Form.TagPicker id="platforms" title="Select Platforms">
        {Object.entries(PLATFORMS).map(([key, value]) => (
          <Form.TagPicker.Item key={key} value={key} title={value} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

function ProcessImage({ imagePath, platforms }: { imagePath: string; platforms: string[] }) {
  async function processImage() {
    try {
      console.log("Starting image processing...");
      console.log("Image path:", imagePath);
      console.log("Selected platforms:", platforms);

      // Check if the file exists and is accessible
      await fs.access(imagePath);
      console.log("File exists and is accessible");

      // Create output directory
      const parentDir = dirname(imagePath);
      const baseFileName = basename(imagePath, ".png");
      const outputDir = join(parentDir, `${baseFileName}_icons`);
      await fs.mkdir(outputDir, { recursive: true });

      console.log("Output directory:", outputDir);

      // Show processing start HUD
      await showHUD("Processing image...");

      // Read file content
      const buffer = await fs.readFile(imagePath);
      console.log("File read successfully, buffer length:", buffer.length);

      // Read original image
      const image = await Jimp.read(buffer);
      console.log("Image loaded successfully");

      // Process each platform
      for (const platform of platforms) {
        const platformDir = join(outputDir, platform);
        await fs.mkdir(platformDir, { recursive: true });

        if (platform === "ico") {
          await generateIcoIcon(image, platformDir);
        } else {
          await generatePlatformIcons(image, platform as keyof typeof SIZES, platformDir);
        }
      }

      // Show processing complete HUD
      await showHUD("Icons generated successfully!");

      // Open output directory
      await open(outputDir);

    } catch (error) {
      console.error("Error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to process image. Please check the logs.",
      });
    }
  }

  processImage();

  return null;
}

async function generateIcoIcon(image: Jimp, outputDir: string) {
  const sizes = SIZES.ico;
  const pngBuffers = await Promise.all(
    sizes.map(async (size) => {
      const resized = await image.clone().resize(size, size);
      return resized.getBufferAsync(Jimp.MIME_PNG);
    })
  );

  try {
    const icoBuffer = await pngToIco(pngBuffers);
    await fs.writeFile(join(outputDir, "icon.ico"), icoBuffer);
    console.log(`Generated multi-size ICO icon (sizes: ${sizes.join(', ')})`);
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
    })
  );
}
