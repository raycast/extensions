import { runAppleScript } from "run-applescript";

export default async () => {
  const script = `tell application "Spotify"
  if player state is playing then
      set playPos to player position + 10.0
      set player position to playPos
  end if
end tell`;
const result = await runAppleScript(script);
}