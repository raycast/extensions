import { runAppleScript } from "run-applescript";

/** AppleScriptObjC framework and library imports */
export const objcImports = `use framework "AVFoundation"
use framework "CoreLocation"
use framework "CoreMedia"
use framework "EventKit"
use framework "Foundation"
use framework "GamePlayKit"
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
use scripting additions`;

/** AS handler to split text around the provided delimiter */
export const splitHandler = `on split(theText, theDelimiter)
    set oldDelimiters to AppleScript's text item delimiters
    set AppleScript's text item delimiters to theDelimiter
    set theArray to every text item of theText
    set AppleScript's text item delimiters to oldDelimiters
    return theArray
end split`;

/** AS handler to replace all occurrences of a string */
export const replaceAllHandler = `on replaceAll(theText, textToReplace, theReplacement)
    set theString to current application's NSString's stringWithString:theText
    set replacedString to theString's stringByReplacingOccurrencesOfString:textToReplace withString:theReplacement
    return replacedString as text
end replaceAll`;

/** AS handler to trim leading and trailing whitespace, including newlines */
export const trimHandler = `on trim(theText)
    set theString to current application's NSString's stringWithString:theText
    set spaces to current application's NSCharacterSet's whitespaceAndNewlineCharacterSet
    set trimmedString to theString's stringByTrimmingCharactersInSet:spaces
    return trimmedString as text
end trim`;

/** AS handler to randomly select items from a list */
export const rselectHandler = `on rselect(theList, numItems)
    set randomSource to current application's GKRandomSource's alloc()'s init()
    set shuffledArray to randomSource's arrayByShufflingObjectsInArray:theList
    return items 1 thru numItems of (shuffledArray as list)
end rselect`;

/**
 * Adds a file to the current Finder selection.
 * @param filePath The path of the file to add to the selection.
 * @returns A promise that resolves to void when the AppleScript has finished running.
 */
export const addFileToSelection = async (filePath: string) => {
  await runAppleScript(`tell application "Finder"
        set theSelection to selection as alias list
        set targetPath to POSIX file "${filePath}"
        copy targetPath to end of theSelection
        select theSelection
    end tell`);
};
