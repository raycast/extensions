import { runAppleScript } from "@raycast/utils";

// QuickTime Player represents a stream's URL path as a colon-delimited "file" path
// (e.g. "/hls/abc/index.m3u8" becomes "...:hls:abc:index.m3u8"), so compare against
// that suffix rather than the document's "name" (which is just the last path segment).
function streamPathSuffix(streamUrl: string): string {
  return streamUrl.replace(/^[a-z]+:\/\/[^/]+\//, "").replace(/\//g, ":");
}

function isStreamOpenExpression(streamUrl: string): string {
  return `(exists document 1) and ((file of document 1 as text) ends with "${streamPathSuffix(streamUrl)}")`;
}

export async function isPlaying(streamUrl: string): Promise<boolean> {
  const result = await runAppleScript(`
    tell application "QuickTime Player"
      if ${isStreamOpenExpression(streamUrl)} then
        return "true"
      else
        return "false"
      end if
    end tell`);
  return result === "true";
}

export async function play(streamUrl: string): Promise<string> {
  return runAppleScript(`try
      tell application "QuickTime Player"
        if ${isStreamOpenExpression(streamUrl)} then
          -- The Lot Radio stream is already open, close it to stop playback
          tell document 1 to close
          return "Closed The Lot Radio stream"
        end if

        -- No matching document open, start playing the stream
        open location "${streamUrl}"
        set attemptCount to 0
        repeat while visible of window 1 = false
          if attemptCount >= 20 then
            error "Timed out waiting for The Lot Radio stream to load"
          end if
          delay 0.5
          set attemptCount to attemptCount + 1
        end repeat
        set visible of window 1 to false
        return "Playing The Lot Radio"
      end tell
    on error errMsg number errNum
      error errMsg number errNum
    end try`);
}
