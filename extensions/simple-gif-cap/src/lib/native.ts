// Typed wrappers around the Swift functions in swift/Sources/GifCapHelper.
import {
  encodeGif as swiftEncodeGif,
  pickTarget as swiftPickTarget,
  probeMedia as swiftProbeMedia,
  screenUnderMouse as swiftScreenUnderMouse,
  startRecording as swiftStartRecording,
} from "swift:../../swift";

export interface PickResult {
  kind: "region" | "window";
  /** Global top-left points, "x,y,w,h". */
  rect: string;
  id?: number | null;
}

export interface RecordingRequest {
  rect: string;
  windowId: number | null;
  output: string;
  countdown: number;
  maxSeconds: number;
  showClicks: boolean;
  showCursor: boolean;
  doneURL: string;
}

export interface MediaInfo {
  duration: number;
  width: number;
  height: number;
}

export interface NativeEncodeRequest {
  input: string;
  output: string;
  fps: number;
  maxWidth: number;
  start: number;
  end: number | null;
}

/** Name of the compiled helper, used to recognise the recorder process. */
export const HELPER_PROCESS_MARKER = "compiled_raycast_swift";

export const pickTarget = (mode: "region" | "window") => swiftPickTarget(mode) as Promise<PickResult | null>;
export const screenUnderMouse = () => swiftScreenUnderMouse();
export const startRecording = (request: RecordingRequest) => swiftStartRecording(request);
export const probeMedia = (path: string) => swiftProbeMedia(path) as Promise<MediaInfo>;
export const encodeGifNative = (request: NativeEncodeRequest) => swiftEncodeGif(request) as Promise<MediaInfo>;
