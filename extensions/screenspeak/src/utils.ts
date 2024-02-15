import { getApplications, showToast, Toast, open, LocalStorage } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { OpenAI } from "openai";
import fs from "fs";

const execAsync = promisify(exec);

export const SUPERWHISPER_BUNDLE_ID = "com.superduper.superwhisper";

export const initOpenAI = async () => {
  const OPENAI_API_KEY = (await LocalStorage.getItem("openai_api_key")) as string;

  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not found, use Set OpenAI Key command to set it.");
  }

  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });

  return openai;
};

async function isSuperwhisperInstalled() {
  const applications = await getApplications();
  const bundleFound = applications.some(({ bundleId }) => bundleId === SUPERWHISPER_BUNDLE_ID);
  return bundleFound;
}

export async function checkSuperwhisperInstallation() {
  const isInstalled = await isSuperwhisperInstalled();
  if (!isInstalled) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Superwhisper is not installed.",
      message: "Install from superwhisper.com",
      primaryAction: {
        title: "Go to superwhisper.com",
        onAction: (toast) => {
          open("https://superwhisper.com");
          toast.hide();
        },
      },
    };

    await showToast(options);
  }
  return isInstalled;
}

// Function to capture a screenshot and return the file path
export async function captureScreenshot(): Promise<string> {
  const timestamp = Date.now();
  const filePathPrefix = `/tmp/screenshot-${timestamp}`;
  const outputFilePath = `${filePathPrefix}-all.png`;

  // Capture screenshots from display 1 and 2 into separate files. reversed order
  await execAsync(`/usr/sbin/screencapture -C ${filePathPrefix}-display-2.png ${filePathPrefix}-display-1.png`);

  // Concatenate the screenshots into one image
  await execAsync(`/opt/homebrew/bin/montage ${filePathPrefix}-display-*.png -mode concatenate -tile x1 ${outputFilePath}`);

  // Cleanup individual display screenshots
  // await execAsync(`rm ${filePathPrefix}-display-*.png`);

  return outputFilePath;
}

// Function to send a screenshot to GPT-Vision and return the analysis result
export async function sendScreenshotToGPTVision(
  imagePath: string,
  text: string = "Please review this image. In the next message I will add more information on what you need to do with it.",
): Promise<string> {
  const openai = await initOpenAI();

  // Read the image file and convert it to base64
  const image = fs.readFileSync(imagePath, { encoding: "base64" });

  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          // NB: We don't send any text with the command, instead we wait for
          // superwhisper to finish transcribing the voice command and then send it to the model in the separate request
          {
            type: "text",
            text: text,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${image}`,
            },
          },
        ],
      },
    ],
    n: 1,
    // stop: ["\n"],
    temperature: 0.5,
    max_tokens: 4000,
  });

  console.log("GPT Vision response", response);

  return response.choices[0].message.content ?? "";
}

export async function sendTextToGPTVision(text: string): Promise<string> {
  const openai = await initOpenAI();

  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: text,
          },
        ],
      },
    ],
  });

  return response.choices[0].message.content ?? "";
}

// Function to process voice command with Superwhisper and return the result
export async function processVoiceCommandWithSuperwhisper(): Promise<string> {
  // This function should trigger Superwhisper, capture the voice command, and return the text
  // Implementation depends on Superwhisper's capabilities and integration options

  return "Not implemented";
}
