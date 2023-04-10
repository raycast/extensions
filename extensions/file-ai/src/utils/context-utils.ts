import { runAppleScript, runAppleScriptSync } from "run-applescript";
import * as os from "os";

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
      /(<head>[\S\s\n\r]*?<\/head>|<script[\s\S\n\r]+?<\/script>|<style[\s\S\n\r]+?<\/style>|<nav[\s\S\n\r]+?<\/nav>|<link[\s\S\n\r]+?<\/link>|<form[\s\S\n\r]+?<\/form>|<button[\s\S\n\r]+?<\/button>|<!--[\s\S\n\r]+?-->|<select[\s\S\n\r]+?<\/select>|<[\s\n\r\S]+?>)/g,
      " "
    )
    .replaceAll(/[\s\n\r]+/g, " ")
    .replaceAll(/(\([^A-Za-z0-9]*\)|(?<=[,.!?%*])[,.!?%*]*?\s*[,.!?%*])/g, " ");
  return filteredString;
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

export const getWeatherData = (days: number): JSONObject => {
  const jsonObj = getJSONResponse("https://get.geojs.io/v1/ip/geo.json");
  const latitude = jsonObj["latitude"];
  const longitude = jsonObj["longitude"];
  const timezone = (jsonObj["timezone"] as string).replace("/", "%2F");
  return getJSONResponse(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,rain_sum,snowfall_sum,precipitation_hours&current_weather=true&windspeed_unit=ms&forecast_days=${days.toString()}&timezone=${timezone}`
  );
};
