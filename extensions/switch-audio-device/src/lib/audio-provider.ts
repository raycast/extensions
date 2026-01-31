import { AudioProvider } from "./types";
import { MacOSAudioProvider } from "./macos-provider";
import { WindowsAudioProvider } from "./windows-provider";

export function createAudioProvider(): AudioProvider {
  if (process.platform === "darwin") {
    return new MacOSAudioProvider();
  } else if (process.platform === "win32") {
    return new WindowsAudioProvider();
  }
  throw new Error(`Unsupported platform: ${process.platform}`);
}

export function getInstallInfo(): { title: string; copyCommand: string; url: string } {
  if (process.platform === "darwin") {
    return {
      title: "Install SwitchAudioSource",
      copyCommand: "brew install switchaudio-osx",
      url: "https://github.com/deweller/switchaudio-osx",
    };
  }
  return {
    title: "Install AudioDeviceCmdlets",
    copyCommand: "Install-Module -Name AudioDeviceCmdlets -Force",
    url: "https://www.powershellgallery.com/packages/AudioDeviceCmdlets",
  };
}
