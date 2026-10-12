import { extname } from "node:path";
import { pathToFileURL } from "node:url";
import type { Hit } from "../digup/protocol";

export const QUICKTIME = "com.apple.QuickTimePlayerX";
export const IINA = "com.colliderli.iina";
export const VLC = "org.videolan.vlc";

/** The app (by bundle id) can be told where in a recording to start. Others open the file at its beginning. */
export function jumpsToMoments(bundleId: string | undefined): boolean {
  return bundleId === QUICKTIME || bundleId === IINA || bundleId === VLC;
}

/** What QuickTime Player plays as it is. It turns away Matroska, WebM, FLAC and Ogg, and most AVI and WMV. */
const QUICKTIME_PLAYS = new Set([
  "mov",
  "mp4",
  "m4v",
  "3gp",
  "3g2",
  "mp3",
  "m4a",
  "m4b",
  "aac",
  "wav",
  "aif",
  "aiff",
  "aifc",
  "caf",
]);

/** QuickTime Player can play this file, going by its extension. */
export function quickTimePlays(path: string): boolean {
  return QUICKTIME_PLAYS.has(extname(path).slice(1).toLowerCase());
}

/** The second a recording matched at, when it's worth jumping to (a second or more in). */
export function momentOf(hit: Hit): number | null {
  const isMoment = hit.segment === "frame" || hit.segment === "audio";
  return isMoment && hit.loc !== undefined && hit.loc >= 1 ? hit.loc : null;
}

/** The PDF page that matched. */
export function pageOf(hit: Hit): number | null {
  const isPage = hit.segment === "page" || hit.segment === "page_image";
  return isPage && hit.loc !== undefined ? Math.trunc(hit.loc) : null;
}

export function iinaLink(path: string, seconds: number): string {
  return `iina://open?url=${encodeURIComponent(pathToFileURL(path).href)}&mpv_start=${seconds.toFixed(1)}`;
}

/** Opens a recording in QuickTime Player at a moment. The time comes as whole milliseconds (a decimal point depends on locale). */
export const QUICKTIME_SCRIPT = `on run argv
    set theFile to POSIX file (item 1 of argv)
    set theTime to (item 2 of argv as integer) / 1000
    tell application "QuickTime Player"
        activate
        set theDocument to open theFile
        set current time of theDocument to theTime
        try
            set miniaturized of (first window whose document is theDocument) to false
        end try
        play theDocument
        return current time of theDocument
    end tell
end run`;

/** `osascript` arguments. macOS asks once whether Raycast may control QuickTime Player; refused, the script fails. */
export function quickTimeArguments(path: string, seconds: number): string[] {
  return ["-e", QUICKTIME_SCRIPT, path, String(Math.trunc(seconds * 1000))];
}

/**
 * Opens a recording in VLC at a moment, in whole seconds. VLC takes a time only for what it is playing, so the
 * script waits (three seconds at most; it is only run for a VLC that is already open) until VLC plays this file: set at once, the time
 * would land on whatever was playing before, or on nothing.
 *
 * It doesn't wait for VLC's answer to the open: VLC 3 takes five seconds to give it, playing from the start
 * meanwhile, and the jump then came five seconds late (measured 2026-10-12: 5.2 s with the answer, 0.3 s without).
 */
export const VLC_SCRIPT = `on run argv
    set thePath to item 1 of argv
    set theFile to POSIX file thePath
    set theSeconds to (item 2 of argv as integer)
    tell application "VLC"
        activate
        ignoring application responses
            open theFile
        end ignoring
        repeat 60 times
            try
                if playing and (path of current item is thePath) then exit repeat
            end try
            delay 0.05
        end repeat
        set current time to theSeconds
        return current time
    end tell
end run`;

/** `osascript` arguments. macOS asks once whether Raycast may control VLC; refused, the script fails. */
export function vlcArguments(path: string, seconds: number): string[] {
  return ["-e", VLC_SCRIPT, path, String(Math.trunc(seconds))];
}

/**
 * `open` arguments that start VLC on a file at a moment, with nothing controlling it: VLC takes the start time as
 * an option of the file (":start-time", for this file only; "--start-time" would hold for everything it plays
 * afterwards). macOS hands arguments only to an app it starts, so this is for when VLC isn't running: given to a
 * running VLC they are dropped, file and all, and `-n` would start a second VLC beside it.
 */
export function vlcLaunchArguments(path: string, seconds: number): string[] {
  return ["-n", "-b", VLC, "--args", path, `:start-time=${seconds.toFixed(1)}`];
}

/**
 * Opens a document in its app with words to search for, the way Spotlight opens documents: Preview fills its search
 * with them and lists the matches by page. Prints "sent", or "no app".
 */
export const PREVIEW_SEARCH_SCRIPT = `ObjC.import("AppKit");
function run(argv) {
  const url = $.NSURL.fileURLWithPath(argv[0]);
  const workspace = $.NSWorkspace.sharedWorkspace;
  const app = workspace.URLForApplicationToOpenURL(url);
  if (app.isNil()) return "no app";
  // The Open Documents event ('aevt'/'odoc') with the file ('----') and the text to search for ('stxt').
  const event = $.NSAppleEventDescriptor.appleEventWithEventClassEventIDTargetDescriptorReturnIDTransactionID(
    0x61657674, 0x6f646f63, $(), -1, 0);
  const files = $.NSAppleEventDescriptor.listDescriptor;
  files.insertDescriptorAtIndex($.NSAppleEventDescriptor.descriptorWithFileURL(url), 0);
  event.setParamDescriptorForKeyword(files, 0x2d2d2d2d);
  event.setParamDescriptorForKeyword($.NSAppleEventDescriptor.descriptorWithString(argv[1]), 0x73747874);
  const configuration = $.NSWorkspaceOpenConfiguration.configuration;
  configuration.appleEvent = event;
  workspace.openApplicationAtURLConfigurationCompletionHandler(app, configuration, $());
  // The request goes out on the run loop: give it a second before this script ends.
  $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(1.0));
  return "sent";
}`;

export function previewSearchArguments(path: string, words: string): string[] {
  return ["-l", "JavaScript", "-e", PREVIEW_SEARCH_SCRIPT, path, words];
}
