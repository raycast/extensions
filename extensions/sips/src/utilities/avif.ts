/**
 * @file utilities/avif.ts
 *
 * @summary Utilities for working with AVIF images.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2024-06-04 05:46:15
 * Last modified  : 2024-06-26 21:37:46
 */

import { LocalStorage, Toast, confirmAlert, showToast } from "@raycast/api";
import { execSync } from "child_process";

const EncoderNotFoundError = {
  title: "AVIF Encoder not found.",
  message: "Please install the avifenc Homebrew formula and try again.",
  style: Toast.Style.Failure,
};

/**
 * Attempts to install the AVIF encoder using Homebrew.
 *
 * @returns A promise that resolves when the AVIF encoder is installed.
 */
async function installAVIFEnc(): Promise<boolean> {
  let brewPath = "";
  try {
    brewPath = execSync(`/bin/zsh -ilc "which brew"`).toString().trim();
  } catch (error) {
    console.error(error);
  }

  if (brewPath === "") {
    await showToast({
      title: "Homebrew is required to install the AVIF encoder.",
      message:
        "Please install Homebrew and try again. Visit https://brew.sh for more information. Once Homebrew is installed, run the command `brew install joedrago/repo/avifenc` to install the AVIF encoder manually (Otherwise, this command will be run automatically).",
      style: Toast.Style.Failure,
    });
    return false;
  }

  if (
    await confirmAlert({
      title: "Install AVIF Encoder",
      message:
        "The avifenc Homebrew formula is required to convert images to/from AVIF format. Would you like to install it now?",
      primaryAction: {
        title: "Install",
      },
    })
  ) {
    const toast = await showToast({
      title: "Installing AVIF Encoder...",
      style: Toast.Style.Animated,
    });
    execSync(`${brewPath} install joedrago/repo/avifenc`);
    toast.title = "AVIF Encoder installed successfully!";
    toast.style = Toast.Style.Success;
    return true;
  }
  await showToast({
    title: "AVIF Encoder not installed.",
    style: Toast.Style.Failure,
  });
  return false;
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
      encoderPath = execSync(`/bin/zsh -ilc "which avifenc"`).toString().trim();
      decoderPath = execSync(`/bin/zsh -ilc "which avifdec"`).toString().trim();
    } catch (error) {
      // If the AVIF encoder is not found, prompt the user to install it
      if (await installAVIFEnc()) {
        try {
          encoderPath = execSync(`/bin/zsh -ilc "which avifenc"`).toString().trim();
          decoderPath = execSync(`/bin/zsh -ilc "which avifdec"`).toString().trim();
          await LocalStorage.setItem("avifEncoderPath", encoderPath);
          await LocalStorage.setItem("avifDecoderPath", decoderPath);
        } catch (error) {
          console.error(error);
          await showToast(EncoderNotFoundError);
        }
      } else {
        await showToast(EncoderNotFoundError);
      }
    }
  }
  return {
    encoderPath,
    decoderPath,
  };
}
