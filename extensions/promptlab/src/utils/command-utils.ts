import { runAppleScript } from "run-applescript";

/**
 * Runs the action script of a PromptLab command, providing the AI response as the `response` variable.
 *
 * The following handlers are provided:
 *  - `split(theString, theDelimiter)` - Splits text around a delimiter
 *  - `trim(theString)` - Removes leading and trailing spaces from text
 *
 * The following AppleScriptObjC frameworks are supported and automatically imported: `AVFoundation`, `CoreLocation`, `CoreMedia`, `EventKit`, `Foundation`, `LatentSemanticMapping`, `MapKit`, `PDFKit`, `Photos`, `Quartz`, `SafariServices`, `ScreenCaptureKit`, `ScreenSaver`, `SoundAnalysis`, `Speech`, `Vision`, and `Webkit`
 *
 * @param script The AppleScript script to execute.
 * @param response The PromptLab AI response.
 */
export const runActionScript = async (script: string, response: string) => {
  try {
    await runAppleScript(`use framework "AVFoundation"
    use framework "CoreLocation"
    use framework "CoreMedia"
    use framework "EventKit"
    use framework "Foundation"
    use framework "LatentSemanticMapping"
    use framework "MapKit"
    use framework "PDFKit"
    use framework "Photos"
    use framework "Quartz"
    use framework "SafariServices"
    use framework "ScreenCaptureKit"
    use framework "ScreenSaver"
    use framework "SoundAnalysis"
    use framework "Speech"
    use framework "Vision"
    use framework "WebKit"
    use scripting additions

    on split(theString, theDelimiter)
        set oldDelimiters to AppleScript's text item delimiters
        set AppleScript's text item delimiters to theDelimiter
        set theArray to every text item of theString
        set AppleScript's text item delimiters to oldDelimiters
        return theArray
    end split

    on trim(theString)
        set startIndex to 0
        set endIndex to 0
        
        set charIndex to 1
        repeat with char in theString
            if (char as text) is not " " then
                set startIndex to charIndex
                exit repeat
            end if
            set charIndex to charIndex + 1
        end repeat
        
        set charIndex to length of theString
        repeat with char in (reverse of items of theString) as text
            if (char as text) is not " " then
                set endIndex to charIndex
                exit repeat
            end if
            set charIndex to charIndex - 1
        end repeat
        
        return text startIndex thru endIndex of theString
    end trim

    set response to "${response.replaceAll('"', '\\"')}"
    ${script}`);
  } catch (error) {
    console.error(error);
  }
};
