import { runAppleScript, runAppleScriptSync } from "run-applescript";
import * as os from "os";
import { filterString } from "./calendar-utils";
import * as fs from "fs";

/**
 * Gets the URL of the active tab in Safari.
 *
 * @returns A promise which resolves to the URL of the active tab as a string.
 */
const getCurrentSafariURL = async (): Promise<string> => {
  return runAppleScript(`try
        tell application "Safari"
            return URL of document 1
        end tell
    end try`);
};

/**
 * Gets the top sites in Safari as a comma-separated string.
 *
 * @returns A promise resolving to the list of top sites as a string.
 */
export const getSafariTopSites = async (): Promise<string> => {
  return runAppleScript(`use framework "Foundation"
    property ca : current application
    
    on plist for thePath
      set plistData to ca's NSData's dataWithContentsOfFile:thePath
      set plist to ca's NSPropertyListSerialization's propertyListWithData:plistData options:(ca's NSPropertyListImmutable) format:(missing value) |error|:(missing value)
    end plist
    
    set topSitesPlist to plist for "${os.homedir()}/Library/Safari/TopSites.plist"
    
    set siteSummaries to {}
    set sites to TopSites of topSitesPlist as list
    repeat with site in sites
      set siteTitle to TopSiteTitle of site
      set siteURL to TopSiteURLString of site
      copy siteTitle & ": " & siteURL to end of siteSummaries
    end repeat
    return siteSummaries`);
};

/**
 * Gets a list of the specified number of bookmarks from Safari.
 *
 * @param count The maximum number of bookmarks to retrieve, defaults to 100
 * @returns A promise resolving to the list of bookmark URLs as a string.
 */
export const getSafariBookmarks = async (count = 100): Promise<string> => {
  return runAppleScript(`use framework "Foundation"

  on plist for thePath
    set plistData to current application's NSData's dataWithContentsOfFile:thePath
    set plist to current application's NSPropertyListSerialization's propertyListWithData:plistData options:(current application's NSPropertyListImmutable) format:(missing value) |error|:(missing value)
  end plist
  
  set bookmarksPlist to (plist for "/Users/steven/Library/Safari/Bookmarks.plist") as record
  
  on getChildBookmarks(node)
    set internalBookmarks to {}
    if WebBookmarkType of node is "WebBookmarkTypeLeaf" then
      set maxLength to 50
      set theURL to URLString of node as text
      if length of theURL < maxLength then
        set maxLength to length of theURL
      end if
      copy text 1 thru maxLength of theURL to end of internalBookmarks
    else if WebBookmarkType of node is "WebBookmarkTypeProxy" then
      -- Ignore
    else
      try
        repeat with theChild in Children of node
          set internalBookmarks to internalBookmarks & my getChildBookmarks(theChild)
        end repeat
      on error err
        log err
      end try
    end if
    return internalBookmarks
  end getChildBookmarks
  
  set bookmarks to {}
  repeat with theChild in Children of bookmarksPlist
    if WebBookmarkType of theChild is "WebBookmarkTypeLeaf" then
      set maxLength to 50
      set theURL to URLString of theChild as text
      if length of theURL < maxLength then
        set maxLength to length of theURL
      end if
      copy text 1 thru maxLength of theURL to end of bookmarks
    else
      set bookmarks to bookmarks & getChildBookmarks(theChild)
    end if
  end repeat
  
  set maxBookmarks to ${count}
  if (count of bookmarks) < maxBookmarks then
    set maxBookmarks to count of bookmarks
  end if

  set finalBookmarks to {}
  repeat maxBookmarks times
    copy some item of bookmarks to end of finalBookmarks
  end repeat
  return finalBookmarks`);
};

/**
 * Gets the URL of the active tab in Arc.
 *
 * @returns A promise which resolves to the URL of the active tab as a string.
 */
const getArcURL = async (): Promise<string> => {
  return runAppleScript(`try
        tell application "Arc"
            return URL of active tab of window 1
        end tell
    end try`);
};

/**
 * Gets the URL of the active tab in iCab.
 *
 * @returns A promise which resolves to the URL of the active tab as a string.
 */
const getiCabURL = async (): Promise<string> => {
  return runAppleScript(`try
        tell application "iCab"
            return url of document 1
        end tell
    end try`);
};

/**
 * Gets the URL of the active tab in a Chromium-based browser.
 *
 * @param browserName The name of the browser.
 * @returns A promise which resolves to the URL of the active tab as a string.
 */
const getChromiumURL = async (browserName: string): Promise<string> => {
  return runAppleScript(`try
        tell application "${browserName}"
            set tabIndex to active tab index of window 1
            return URL of tab tabIndex of window 1
        end tell
    end try`);
};

/**
 * The browsers from which the current URL can be obtained.
 */
export const SupportedBrowsers = [
  "Safari",
  "Chromium",
  "Google Chrome",
  "Opera",
  "Opera Neon",
  "Vivaldi",
  "Microsoft Edge",
  "Brave Browser",
  "Iron",
  "Yandex",
  "Blisk",
  "Epic",
  "Arc",
  "iCab",
];

/**
 * Gets the current URL of the active tab of the specified browser.
 *
 * @param browserName The name of the browser application. Must be a member of {@link SupportedBrowsers}.
 * @returns A promise which resolves to the URL of the active tab of the browser as a string.
 */
export const getCurrentURL = async (browserName: string): Promise<string> => {
  switch (browserName) {
    case "Safari":
      return getCurrentSafariURL();
      break;
    case "Google Chrome":
    case "Microsoft Edge":
    case "Brave Browser":
    case "Opera":
    case "Vivaldi":
    case "Chromium":
      return getChromiumURL(browserName);
      break;
    case "Arc":
      return getArcURL();
      break;
    case "iCab":
      return getiCabURL();
      break;
  }
  return "";
};

/**
 * Gets the raw HTML of a URL.
 *
 * @param URL The URL to get the HTML of.
 * @returns The HTML as a string.
 */
export const getURLHTML = (URL: string): string => {
  return runAppleScriptSync(`use framework "Foundation"
    set theResult to ""
    on getURLHTML(theURL)
        global theResult
        set theURL to current application's NSURL's URLWithString:theURL
        set theSessionConfiguration to current application's NSURLSessionConfiguration's defaultSessionConfiguration()
        set theSession to current application's NSURLSession's sessionWithConfiguration:(theSessionConfiguration) delegate:(me) delegateQueue:(missing value)
        set theRequest to current application's NSURLRequest's requestWithURL:theURL
        set theTask to theSession's dataTaskWithRequest:theRequest
        theTask's resume()
        
        set completedState to current application's NSURLSessionTaskStateCompleted
        set canceledState to current application's NSURLSessionTaskStateCanceling
        
        repeat while theTask's state() is not completedState and theTask's state() is not canceledState
            delay 0.1
        end repeat
        
        return theResult
    end getURLHTML
    
    on URLSession:tmpSession dataTask:tmpTask didReceiveData:tmpData
        global theResult
        set theText to (current application's NSString's alloc()'s initWithData:tmpData encoding:(current application's NSASCIIStringEncoding)) as string

        set theResult to theResult & theText
    end URLSession:dataTask:didReceiveData:
    return getURLHTML("${URL}")`);
};

/**
 * A JSON object returned by {@link getJSONResponse}.
 */
interface JSONObject {
  [key: string]: string | JSONObject;
}

/**
 * Gets the JSON objects returned from a URL.
 *
 * @param URL The url to a .json document.
 * @returns The JSON as a {@link JSONObject}.
 */
export const getJSONResponse = (URL: string): JSONObject => {
  const raw = getURLHTML(URL);
  return JSON.parse(raw);
};

/**
 * Gets the visible text of a URL.
 *
 * @param URL The URL to get the visible text of.
 * @returns A promise resolving to the visible text as a string.
 */
export const getTextOfWebpage = async (URL: string): Promise<string> => {
  const html = getURLHTML(URL);
  const filteredString = html
    .replaceAll(
      /(<script[\s\S\n\r]+?<\/script>|<style[\s\S\n\r]+?<\/style>|<nav[\s\S\n\r]+?<\/nav>|<link[\s\S\n\r]+?<\/link>|<form[\s\S\n\r]+?<\/form>|<button[\s\S\n\r]+?<\/button>|<!--[\s\S\n\r]+?-->|<select[\s\S\n\r]+?<\/select>|<[\s\n\r\S]+?>)/g,
      " "
    )
    .replaceAll(/[\s\n\r]+/g, " ")
    .replaceAll(/(\([^A-Za-z0-9]*\)|(?<=[,.!?%*])[,.!?%*]*?\s*[,.!?%*])/g, " ");
  return filteredString;
};

/**
 * Gets the English transcript of a YouTube video specified by its ID.
 * @param videoId The ID of the YouTube video.
 * @returns A promise resolving to the transcript as a string, or "No transcript available." if there is no transcript.
 */
export const getYouTubeVideoTranscriptById = async (videoId: string): Promise<string> => {
  const html = getURLHTML(`https://www.youtube.com/watch?v=${videoId}`);
  const captionsJSON = JSON.parse(html.split(`"captions":`)[1].split(`,"videoDetails"`)[0].replace("\n", ""))[
    "playerCaptionsTracklistRenderer"
  ];

  if (!("captionTracks" in captionsJSON)) {
    return "No transcript available.";
  }

  const title = html.matchAll(/title":"((.| )*?),"lengthSeconds/g).next().value[1];
  const captionTracks = captionsJSON["captionTracks"];
  const englishCaptionTrack = captionTracks.find((track: JSONObject) => track["languageCode"] === "en");
  if (!englishCaptionTrack) {
    return "No transcript available.";
  }

  const transcriptURL = "https://youtube.com" + englishCaptionTrack["baseUrl"];
  const transcriptText = await getTextOfWebpage(transcriptURL);
  return filterString(`Video Title: ${title}\n\nTranscript:\n${transcriptText}`);
};

/**
 * Gets the English transcript of a YouTube video specified by its URL.
 * @param videoURL The URL of the YouTube video.
 * @returns A promise resolving to the transcript as a string, or "No transcript available." if there is no transcript.
 */
export const getYouTubeVideoTranscriptByURL = async (videoURL: string): Promise<string> => {
  const videoId = videoURL.split("v=")[1].split("&")[0];
  return getYouTubeVideoTranscriptById(videoId);
};

/**
 * Gets the ID of the first YouTube video matching the search text.
 * @param searchText The text to search for.
 * @returns The ID of the first matching video.
 */
export const getMatchingYouTubeVideoID = (searchText: string): string => {
  const html = getURLHTML(`https://www.youtube.com/results?search_query=${encodeURIComponent(searchText)}`);
  const videoID = html.matchAll(/videoId\\x22:\\x22(.*?)\\x22,/g).next().value[1];
  return videoID;
};

/**
 * Gets the name of the currently playing track or stream of Music.app.
 *
 * @returns A promise resolving to the track/stream name as a string.
 */
export const getCurrentTrack = async (): Promise<string> => {
  return runAppleScript(`try
    tell application "Music"
      set trackName to current stream title
      if trackName is missing value then
        set trackName to name of current track
      end if
      return trackName
    end tell
  end try`);
};

/**
 * Gets the list of track names in Music.app.
 *
 * @returns A promise resolving to the list of track names as a string.
 */
export const getTrackNames = async (): Promise<string> => {
  return runAppleScript(`try
    tell application "Music"
      get name of tracks
    end tell
  end try`);
};

/**
 * Gets the plaintext of the most recently edited note.
 *
 * @returns A promise resolving to the note's plaintext as a string.
 */
export const getLastNote = async (): Promise<string> => {
  return runAppleScript(`try
    tell application "Notes"
      get plaintext of note 1
    end tell
  end try`);
};

/**
 * Gets a list of currently installed applications.
 *
 * @returns A promise resolving to the list of apps as a string.
 */
export const getInstalledApplications = async (): Promise<string> => {
  return runAppleScript(`use framework "Foundation"

    property ca : current application
    property theResult : ""
    property query : missing value
    
    try
      set result to ""
      ca's NSNotificationCenter's defaultCenter's addObserver:me selector:"queryDidFinish:" |name|:"NSMetadataQueryDidFinishGatheringNotification" object:(missing value)
      set predicate to ca's NSPredicate's predicateWithFormat:"kMDItemContentType == 'com.apple.application-bundle'"
      set query to ca's NSMetadataQuery's alloc()'s init()
      query's setPredicate:predicate
      query's setSearchScopes:["/Applications", "/Users/"]
      query's startQuery()
      
      repeat while theResult is ""
        delay 0.1
      end repeat
      
      return text 1 thru ((length of theResult) - 2) of theResult
    end try
    
    on queryDidFinish:theNotification
      global result
      set queryResults to theNotification's object()'s results()
      set internalResult to ""
      repeat with object in queryResults
        set itemName to (object's valueForAttribute:("kMDItemFSName")) as text
        set appName to (text 1 thru ((length of itemName) - 4) of itemName)
        if appName does not contain "." and appName does not contain "_" and appName does not end with "Agent" and appName does not end with "Assistant" then
          set internalResult to internalResult & appName & ", "
        end if
      end repeat
      set theResult to internalResult
    end queryDidFinish:`);
};

/**
 * Gets the subject, sender, and content of the most recently received email in Mail.app.
 *
 * @returns A promise resolving to the email as a string.
 */
export const getLastEmail = async (): Promise<string> => {
  return runAppleScript(`try
    tell application "Mail"
      set latestMessage to ""
      set theMailboxes to mailboxes of accounts whose name does not contain "Deleted" and name does not contain "Archive" and name does not contain "Sent"
      
      set newestDate to missing value
      set newestMessage to missing value
      repeat with theAccount in theMailboxes
        repeat with theMailbox in theAccount
          if (count of (messages of theMailbox)) > 0 then
            set theMessage to message 1 of theMailbox
            set messageDate to theMessage's date received
            if newestDate is missing value or messageDate > newestDate then
              set newestDate to messageDate
              set newestMessage to theMessage
            end if
          end if
        end repeat
      end repeat
      
      set messageSubject to newestMessage's subject
      set messageSender to newestMessage's sender
      set messageContent to newestMessage's content
      return "Subject: " & messageSubject & "\\nFrom: " & messageSender & "\\nContent: " & messageContent
    end tell
  end try`);
};

/**
 * Gets the weather forecast from open-meteo.com.
 *
 * @param days The number of days to get the forecast for (either 1 or 7)
 * @returns The forecast as a JSON object.
 */
export const getWeatherData = (days: number): JSONObject => {
  const jsonObj = getJSONResponse("https://get.geojs.io/v1/ip/geo.json");
  const latitude = jsonObj["latitude"];
  const longitude = jsonObj["longitude"];
  const timezone = (jsonObj["timezone"] as string).replace("/", "%2F");
  return getJSONResponse(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,rain_sum,snowfall_sum,precipitation_hours&current_weather=true&windspeed_unit=ms&forecast_days=${days.toString()}&timezone=${timezone}`
  );
};

/**
 * Gets the computer's name.
 *
 * @returns A promise resolving to the computer name as a string.
 */
export const getComputerName = async () => {
  return await runAppleScript(`use scripting additions
  return computer name of ((system info) as record)`);
};

/**
 * Gets the current Finder directory.
 * @returns A promise resolving to the path of the current directory as a string.
 */
export const getCurrentDirectory = async () => {
  return await runAppleScript(`tell application "Finder"
    return POSIX path of (insertion location as alias)
  end tell`);
};

/**
 * Gets the application that owns the menubar.
 * @param includePaths Whether to include the path of the application.
 * @returns A promise resolving to the name of the application as a string, or an object containing the name and path if includePaths is true.
 */
export const getMenubarOwningApplication = async (
  includePaths?: boolean
): Promise<string | { name: string; path: string }> => {
  const app = await runAppleScript(`use framework "Foundation"
  use scripting additions
  set workspace to current application's NSWorkspace's sharedWorkspace()
  set runningApps to workspace's runningApplications()
  
  set targetApp to missing value
  repeat with theApp in runningApps
    if theApp's ownsMenuBar() then
      set targetApp to theApp
      exit repeat
    end if
  end repeat
  
  if targetApp is missing value then
    return ""
  else
    ${
      includePaths
        ? `return {targetApp's localizedName() as text, targetApp's bundleURL()'s fileSystemRepresentation() as text}`
        : `return targetApp's localizedName() as text`
    }
  end if`);

  if (includePaths) {
    const data = app.split(", ");
    return { name: data[0], path: data[1] };
  }
  return app;
};

/**
 * The same as {@link getMenubarOwningApplication}, but synchronous.
 * @param includePaths Whether to include the path of the application.
 * @returns The name of the application as a string, or an object containing the name and path if includePaths is true.
 */
export const getMenubarOwningApplicationSync = (includePaths?: boolean): string | { name: string; path: string } => {
  const app = runAppleScriptSync(`use framework "Foundation"
  use scripting additions
  set workspace to current application's NSWorkspace's sharedWorkspace()
  set runningApps to workspace's runningApplications()
  
  set targetApp to missing value
  repeat with theApp in runningApps
    if theApp's ownsMenuBar() then
      set targetApp to theApp
      exit repeat
    end if
  end repeat
  
  if targetApp is missing value then
    return ""
  else
    ${
      includePaths
        ? `return {targetApp's localizedName() as text, targetApp's bundleURL()'s fileSystemRepresentation() as text}`
        : `return targetApp's localizedName() as text`
    }
  end if`);

  if (includePaths) {
    const data = app.split(", ");
    return { name: data[0], path: data[1] };
  }
  return app;
};
