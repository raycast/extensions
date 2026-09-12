import { showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function main() {
  const res = await runAppleScript(
    ` 
  on getBackgroundSounds()
    try
      set currentSetting to do shell script "defaults read com.apple.ComfortSounds comfortSoundsEnabled"
      if currentSetting is equal to "1" then
        log "Background sound is on"
        return true
      else
        log "Background sound is off"
        return false
      end if
    on error
      return false
    end try
  end getBackgroundSounds
  
  on setBackgroundSounds(showRecents)
    if showRecents then
      do shell script "defaults write com.apple.ComfortSounds comfortSoundsEnabled -bool true; defaults write com.apple.ComfortSounds lastEnablementTimestamp $(date +%s)"
      log "Background sounds turned on"
    else
      do shell script "defaults write com.apple.ComfortSounds comfortSoundsEnabled -bool false"
      log "Background sounds turned off"
    end if
    do shell script "killall -HUP heard"
    getBackgroundSounds()
  end setBackgroundSounds
  
  if getBackgroundSounds() then
    setBackgroundSounds(false)
  else
    setBackgroundSounds(true)
  end if
`,
    [],
  );

  if (res) {
    await showHUD("Background sound toggled");
  } else {
    await showHUD("Something went wrong. Please try again.");
  }
}
