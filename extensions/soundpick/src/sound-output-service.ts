import { runAppleScript } from "run-applescript";
import { stringToBool } from "./shared/utils";
import { SoundOutputDevice, SoundOutputServiceConfig, AppleScriptParser } from "./shared/types";

export default class SoundOutputService implements SoundOutputService {
  private config: SoundOutputServiceConfig;
  private parser: AppleScriptParser;

  constructor(config: SoundOutputServiceConfig) {
    this.config = config;
    this.parser = this.config.parser;
  }

  async fetchDevices(): Promise<Array<SoundOutputDevice>> {
    try {
      const scriptResponse: string = await runAppleScript(`
      set SystemPreferences to "System Preferences"
      set SoundWindow to "Sound"
      
      tell application "System Preferences"
        set current pane to pane "com.apple.preference.sound"
      end tell
      
      tell application "System Events"
        tell application process SystemPreferences
          repeat until exists tab group 1 of window SoundWindow
            delay 0.1
          end repeat
          
          tell tab group 1 of window SoundWindow
            tell table 1 of scroll area 1
              set EnabledDeviceRow to (first row whose selected is true)
              set EnabledDeviceName to value of text field 1 of EnabledDeviceRow as text
              
              set Response to {{EnabledDeviceName, true}}
              
              set EveryDisabledRow to (every row whose selected is false)
              
              repeat with TheRow in EveryDisabledRow
                try
                  set RowName to (value of text field 1 of TheRow as text)
                  set end of Response to {RowName, false}
                end try
              end repeat

              return Response
            
            end tell
          end tell
        end tell
      end tell
      `);

      console.log(`[INFO]: Got response from runAppleScript: ${scriptResponse}`);

      const response = this.parser.parse(scriptResponse);
      console.log(`[INFO]: Did successfully parse: ${JSON.stringify(response)}`);

      return response;
    } catch (error) {
      console.log(`[ERROR]: Could not fetch available sound output devices`);
      return Array<SoundOutputDevice>();
    }
  }

  async connectToDevice(name: string): Promise<boolean> {
    console.log(`[INFO]: Attempting too connect to ${name}`);
    const strippedName = name.trim();

    try {
      const response: string = await runAppleScript(`
      set SystemPreferences to "System Preferences"
      set SoundWindow to "Sound"
      
      tell application "System Preferences"
        set current pane to pane "com.apple.preference.sound"
      end tell
      
      tell application "System Events"
        tell application process SystemPreferences
          repeat until exists tab group 1 of window SoundWindow
            delay 0.1
          end repeat
          
          tell tab group 1 of window SoundWindow
            tell table 1 of scroll area 1
              set EnabledRow to (first row whose selected is true)
              set EnabledRowName to (value of text field 1 of EnabledRow as text)
              
              if EnabledRowName is equal to "${strippedName}" then
                return true
              else
                set EveryDisabledRow to (every row whose selected is false)

                repeat with TheRow in EveryDisabledRow
                  set RowName to (value of text field 1 of TheRow as text)
                  if RowName is equal to "${strippedName}" then
                    set selected of TheRow to true

                    return true
                  else
                    return false
                  end if
                end repeat
              end if
            end tell
          end tell
        end tell
      end tell
      `);

      console.log(`[INFO]: Got response from runAppleScript: ${response}`);
      return stringToBool(response);
    } catch (error) {
      console.log(`[ERROR]: Could not set selected state for '${strippedName}' to true`);
      return false;
    }
  }

  async closeSystemPreferences() {
    await runAppleScript(`
    tell application "System Preferences"
      quit
    end tell
    `);
  }
}
