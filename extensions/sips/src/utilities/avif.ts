/**
 * @file utilities/avif.ts
 *
 * @summary Utilities for working with AVIF images.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2024-06-04 05:46:15
 */

import { execSync } from "child_process";

import { LocalStorage, Toast, confirmAlert, showToast } from "@raycast/api";
import { showErrorToast } from "./utils";
import { existsSync } from "fs";

/**
 * Attempts to install the AVIF encoder using Homebrew.
 *
 * @returns A promise that resolves when the AVIF encoder is installed.
 */
async function installAVIFEnc(): Promise<boolean> {
  let brewPath = "";
  try {
    brewPath = execSync(`/bin/zsh -lc 'realpath "$(which brew)"'`).toString().trim();
  } catch (error) {
    console.error(error);
  }

  if (brewPath === "") {
    await showToast({
      title: "Homebrew is required to install the AVIF encoder.",
      message:
        "Please install Homebrew and try again. Visit https://brew.sh for more information. Once Homebrew is installed, run the command `brew install libavif` to install the AVIF encoder manually (Otherwise, this command will be run automatically).",
      style: Toast.Style.Failure,
    });
    return false;
  }

  if (
    await confirmAlert({
      title: "Install AVIF Encoder",
      message:
        "The libavif Homebrew formula is required to convert images to/from AVIF format. Would you like to install it now?",
      primaryAction: {
        title: "Install",
      },
    })
  ) {
    const toast = await showToast({
      title: "Installing AVIF Encoder...",
      style: Toast.Style.Animated,
    });
    try {
      // Use '|| true' to ignore intermediate errors; we verify installation separately
      execSync(`/bin/zsh -ilc '${brewPath} install --quiet libavif || true'`);

      if (!verifyInstall()) {
        throw new Error(`The avifenc binary has not been added to the user's $PATH`);
      }

      toast.title = "AVIF Encoder installed successfully!";
      toast.style = Toast.Style.Success;
      return true;
    } catch (error) {
      console.error(error);
      showErrorToast(
        "Failed to install AVIF Encoder.",
        error as Error,
        toast,
        "If you previously attempted to install libavif or avifenc, please run `brew doctor` followed by `brew cleanup` and try again.",
      );
    }
  }
  await showToast({
    title: "AVIF Encoder not installed.",
    style: Toast.Style.Failure,
  });
  return false;
}

async function verifyInstall() {
  const MAX_VERIFICATION_ATTEMPTS = 7;
  const ATTEMPT_DELAY_DURATION = 1000;

  let exists = false;
  let attempts = 0;
  while (!exists && attempts < MAX_VERIFICATION_ATTEMPTS) {
    const encoderPath = execSync(`/bin/zsh -lc 'command -v avifenc'`).toString().trim();
    if (existsSync(encoderPath)) {
      exists = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, ATTEMPT_DELAY_DURATION));
    attempts++;
  }
  return exists;
}

/**
 * Gets the paths to the AVIF encoder and decoder.
 *
 * @returns An promise resolving to an object containing the encoder/decoder paths.
 */
export async function getAVIFEncPaths() {
  let encoderPath = await LocalStorage.getItem("avifEncoderPath");
  let decoderPath = await LocalStorage.getItem("avifDecoderPath");

  if (!encoderPath || !decoderPath) {
    // Get the path to the AVIF encoder
    try {
      encoderPath = execSync(`/bin/zsh -lc 'realpath "$(which avifenc)"'`).toString().trim();
      decoderPath = execSync(`/bin/zsh -lc 'realpath "$(which avifdec)"'`).toString().trim();
    } catch (error) {
      // If the AVIF encoder is not found, prompt the user to install it
      if (await installAVIFEnc()) {
        try {
          return await getAVIFEncPaths();
        } catch (error) {
          console.error(error);
          showErrorToast(
            "AVIF Encoder not found.",
            error as Error,
            undefined,
            "Please install the libavif Homebrew formula manually and try again.",
          );
        }
      } else {
        showErrorToast(
          "AVIF Encoder not found.",
          error as Error,
          undefined,
          "Please install the libavif Homebrew formula and try again.",
        );
      }
    }
  }
  return {
    encoderPath,
    decoderPath,
  };
}
