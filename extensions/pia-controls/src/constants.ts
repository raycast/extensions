export const piaPath = "/usr/local/bin/piactl";
export const openPiaScript = ` tell application "Private Internet Access"
      if not application "Private Internet Access" is running then
        activate

        set _maxOpenWaitTimeInSeconds to 5
        set _openCounter to 1
        repeat until application "Private Internet Access" is running
          delay 1
          set _openCounter to _openCounter + 1
          if _openCounter > _maxOpenWaitTimeInSeconds then exit repeat
        end repeat
      end if
    end tell`;
