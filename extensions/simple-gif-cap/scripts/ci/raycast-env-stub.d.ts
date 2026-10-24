// Stand-in for the declarations `ray build` generates from swift/ on macOS.
// CI runs on Linux, where the Swift package cannot be built, so it copies this
// file to raycast-env.d.ts before typechecking. Keep it in sync with the
// @raycast functions in swift/Sources/GifCapHelper and the preferences in
// package.json.
type ExtensionPreferences = {
  outputDir: string;
  fps: "10" | "15" | "20" | "30";
  maxWidth: "640" | "800" | "1000" | "1280" | "1600" | "0";
  encoder: "auto" | "builtin" | "ffmpeg" | "gifski";
  countdown: "0" | "3" | "5";
  maxDuration: "0" | "15" | "30" | "60" | "120" | "300";
  showClicks: boolean;
  showCursor: boolean;
  ffmpegPath?: string;
};

declare type Preferences = ExtensionPreferences;

declare module "swift:*/swift" {
  export function pickTarget(mode: string): Promise<any | null>;
  export function screenUnderMouse(): Promise<string>;
  export function startRecording(request: any): Promise<number>;
  export function runRecorder(request: any): Promise<void>;
  export function probeMedia(path: string): Promise<any>;
  export function encodeGif(request: any): Promise<any>;

  export class SwiftError extends Error {
    stderr: string;
    stdout: string;
  }
}
