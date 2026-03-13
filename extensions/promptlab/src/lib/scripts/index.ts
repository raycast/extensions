import { spawn } from "child_process";
import * as util from "util";
import { DebugStyle, logDebug } from "../dev-utils";
import { ImageData, PDFData } from "./types";
import { CalendarDuration, EventType, ReturnType } from "./enums";
import { environment } from "@raycast/api";
import path from "path";
import { filterString } from "../context-utils";
import * as fs from "fs";
import * as os from "os";
import { runAppleScript } from "@raycast/utils";

/**
 * Executes an OSA script using the `osascript` command.
 * @param script The script to execute (either a path to a file or the script itself)
 * @param args The arguments to pass to the script
 * @param language The language of the script, defaults to AppleScript
 * @returns A promise that resolves to the output of the script.
 */
export const execScript = (
  script: string,
  args: (string | boolean | number)[],
  language = "AppleScript",
  stderrCallback?: (data: string) => void,
): { data: Promise<string>; sendMessage: (msg: string) => void } => {
  let data = "";
  let sendMessage: (msg: string) => void = (msg: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    msg;
  };
  const proc = spawn("osascript", [
    ...(script.startsWith("/") ? [] : ["-e"]),
    script,
    "-l",
    language,
    ...args.map((x) => x.toString()),
  ]);

  logDebug(
    `Running shell command "osascript ${[
      ...(script.startsWith("/") ? [] : ["-e"]),
      script,
      "-l",
      language,
      ...args.map((x) => x.toString()),
    ].join(" ")}"`,
  );

  proc.stdout?.on("data", (chunk) => {
    data += chunk.toString();
  });

  proc.stderr?.on("data", (chunk) => {
    if (stderrCallback) {
      stderrCallback(chunk.toString());
    }
  });

  proc.stdin.on("error", (err) => {
    logDebug(`Error writing to stdin: ${err}`, DebugStyle.Error);
  });

  sendMessage = async (message: string) => {
    if (message?.length > 0) {
      proc.stdin.cork();
      proc.stdin.write(`${message}\r\n`);
      proc.stdin.pipe(proc.stdin, { end: false });
      process.nextTick(() => proc.stdin.uncork());
    }
  };

  const waitForFinish = async () => {
    while (proc.stdout?.readable && proc.stderr?.readable && proc.stdin?.writable) {
      await util.promisify(setTimeout)(100);
    }
    return data;
  };

  return { data: waitForFinish(), sendMessage: sendMessage };
};

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

/**
 * Searches for nearby locations matching the provided query.
 * @param query The query to search for.
 * @returns A promise that resolves to a new-line-separated list of addresses.
 */
export const searchNearbyLocations = async (query: string) => {
  return runAppleScript(`set jxa to "(() => {
        ObjC.import('MapKit');
      
        const searchRequest = $.MKLocalSearchRequest.alloc.init;
        searchRequest.naturalLanguageQuery = '${query}';
      
        const search = $.MKLocalSearch.alloc.initWithRequest(searchRequest);
        let addresses = [];
        search.startWithCompletionHandler((response, error) => {
          if (error.localizedDescription) {
            console.error(error.localizedDescription.js);
          } else {
            const numItems = response.mapItems.count > 10 ? 10 : response.mapItems.count;
            for (let i = 0; i < numItems; i++) {
              const item = response.mapItems.objectAtIndex(i);
              const placemark = item.placemark;
              addresses.push(\`\${item.name.js}, \${placemark.subThoroughfare.js} \${placemark.thoroughfare.js}, \${placemark.locality.js}, \${placemark.administrativeArea.js}\`);
            }
          }
        });
      
        const startDate = $.NSDate.date;
        while (startDate.timeIntervalSinceNow > -2) {
          runLoop = $.NSRunLoop.currentRunLoop;
          today = $.NSDate.dateWithTimeIntervalSinceNow(0.1);
          runLoop.runUntilDate(today);
        }

        return addresses.join(\`
        \`);
      })();"
      
      return run script jxa in "JavaScript"`);
};

/**
 * Displays a dialog window with the provided title and content
 * @param title The title of the dialog window.
 * @param content The message text of the dialog window.
 */
export const showDialog = async (title: string, content: string) => {
  return runAppleScript(
    `display dialog "${content.replaceAll('"', '\\"')}" with title "${title.replaceAll('"', '\\"')}"`,
  );
};

/**
 * Gets the names of all currently running non-background applications.
 * @returns A promise that resolves to a comma-separated list of application names.
 */
export const getRunningApplications = async (): Promise<string> => {
  return runAppleScript(`tell application "System Events"
            return displayed name of every application process whose background only is false
        end tell`);
};

/**
 * Gets the name of the system's language.
 * @returns A promise that resolves to the name of the system language as a string.
 */
export const getSystemLanguage = async (): Promise<string> => {
  return runAppleScript(`use framework "Foundation"
        set locale to current application's NSLocale's autoupdatingCurrentLocale()
        set langCode to locale's languageCode()
        return locale's localizedStringForLanguageCode:langCode`);
};

/**
 * Executes an AppleScript/JXA script in the assets directory by name.
 * @param scriptName The name of the script to execute.
 * @param returnType The type of data to return from the script, one of {@link ReturnType}
 * @param language The language of the script, either "AppleScript" or "JavaScript"
 * @param args Any arguments to pass to the script.
 * @returns A promise that resolves to the script's return value in the specified format.
 */
export const runScript = async (
  scriptName: string,
  returnType = ReturnType.STRING,
  language = "AppleScript",
  ...args: (string | number | boolean)[]
): Promise<string | object> => {
  const scriptPath = path.resolve(environment.assetsPath, "scripts", `${scriptName}.scpt`);
  const script = await execScript(scriptPath, args, language).data;
  if (returnType === ReturnType.JSON && script.trim().length != 0) return JSON.parse(script);
  return script;
};

/**
 * A wrapper around `runScript` that provides access to various scripts as parameterized functions.
 */
export const ScriptRunner = {
  /**
   * The main entry point for running AppleScripts. This function is used by all other functions in this module.
   */
  runScript: runScript,

  /**
   * Transcribes audio from a file.
   * @param filePath The path of the file to analyze.
   * @param maxCharacters The maximum number of characters to transcribe.
   * @returns The transcribed text as a string.
   */
  AudioTranscriber: (filePath: string, maxCharacters: number) =>
    runScript("AudioTranscriber", ReturnType.STRING, "AppleScript", filePath, maxCharacters) as Promise<string>,

  /**
   * Fetches event data from EventKit.
   * @param eventType The type of event to fetch, one of {@link EventType}.
   * @param duration The duration of events to fetch, one of {@link CalendarDuration}
   * @returns A promise that resolves to a string containing the event data, i.e. the title, start date, and end date / due date of each event.
   */
  Events: async (eventType: EventType, duration: CalendarDuration) => {
    const data = await (runScript("Events", ReturnType.STRING, "AppleScript", eventType, duration) as Promise<string>);
    const shortenedEventsString = filterString(data);
    if (shortenedEventsString.length < data.length - 100) {
      return shortenedEventsString + " There are more events, but there are too many to list here.";
    }
    return shortenedEventsString;
  },

  /**
   * Extracts various features from an image file.
   * @param filePath The path of the file to analyze.
   * @param useSubjectClassification The comma-separated list of subjects/objects identified in the image.
   * @param useBarcodeDetection The decoded text of any barcodes or QR codes in the image.
   * @param useFaceDetection The number of faces detected in the image.
   * @param useRectangleDetection The center points and dimensions of all rectangles detected in the image.
   * @param useSaliencyAnalysis The coordinates of the points of interest in the image.
   * @param confidenceThreshold The minimum confidence threshold for detected objects.
   * @returns An object containing the extracted features.
   */
  ImageFeatureExtractor: (
    filePath: string,
    useSubjectClassification: boolean,
    useBarcodeDetection: boolean,
    useFaceDetection: boolean,
    useRectangleDetection: boolean,
    useSaliencyAnalysis: boolean,
    useHorizonDetection: boolean,
    confidenceThreshold = 0.7,
  ) =>
    runScript(
      "ImageFeatureExtractor",
      ReturnType.JSON,
      "AppleScript",
      filePath,
      useSubjectClassification,
      useBarcodeDetection,
      useFaceDetection,
      useRectangleDetection,
      useSaliencyAnalysis,
      useHorizonDetection,
      confidenceThreshold,
    ) as Promise<ImageData>,

  /**
   * Extracts text from a PDF file.
   * @param filePath The path of the PDF file to analyze.
   * @param useOCR Whether to use OCR to extract text from the PDF.
   * @param pageLimit The maximum number of pages to extract text from.
   * @param useMetadata Whether to extract metadata from the PDF.
   * @returns An object containing the extracted text.
   */
  PDFTextExtractor: (filePath: string, useOCR: boolean, pageLimit: number, useMetadata: boolean) =>
    runScript(
      "PDFTextExtractor",
      ReturnType.JSON,
      "AppleScript",
      filePath,
      useOCR,
      pageLimit,
      useMetadata,
    ) as Promise<PDFData>,

  /**
   * Analyzes an instantaneous screenshot of the display, extracting various features. Deletes the screenshot after analysis.
   * @returns The path of the screenshot file.
   */
  ScreenCapture: async (windowOnly = false) => {
    const tempPath = path.join(os.tmpdir(), "screenshot.png");
    await (runScript("ScreenCapture", ReturnType.STRING, "JavaScript", tempPath, windowOnly) as Promise<string>);
    const data = await ScriptRunner.ImageFeatureExtractor(tempPath, true, true, true, true, false, false, 0.7);
    await fs.promises.rm(tempPath);
    return data.stringValue;
  },

  /**
   * Gets the selected files from Finder, even if Finder is not the active application.
   * @returns An object containing the array of paths of the selected files and a comma-separated string of the paths.
   */
  SelectedFiles: async () => {
    const data = await (runScript("SelectedFiles", ReturnType.STRING, "AppleScript") as Promise<string>);
    const paths = data.split("::").map((path) => path.trim());
    const csv = paths.join(",");
    return { paths, csv };
  },

  /**
   * Classifies sounds in an audio file.
   * @param filePath The path of the audio file to analyze.
   * @returns The comma-separated list of sounds identified in the audio file.
   */
  SoundClassifier: (filePath: string) =>
    runScript("SoundClassifier", ReturnType.STRING, "AppleScript", filePath) as Promise<string>,
};
