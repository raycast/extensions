import { runAppleScript } from "run-applescript";

/**
 * Gets the URL of the active tab in Safari.
 *
 * @returns A promise which resolves to the URL of the active tab as a string.
 */
const getCurrentSafariURL = async (): Promise<{ name: string; url: string }> => {
  const data = await runAppleScript(`try
      set oldDelims to AppleScript's text item delimiters
      set AppleScript's text item delimiters to "\`\`\`"
          tell application "Safari"
              set theData to {name, URL} of document 1
              set theData to theData as string
              set AppleScript's text item delimiters to oldDelims
              return theData
          end tell
      end try`);
  const entries = data.split("```");
  if (entries.length === 2) {
    return { name: entries[0], url: entries[1] };
  }
  return { name: "", url: "" };
};

/**
 * Gets the name and URL of each tab in Safari.
 * @returns A promise which resolves to an array of objects containing the name and URL of each tab.
 */
const getSafariTabs = async (): Promise<{ name: string; url: string }[]> => {
  const data = await runAppleScript(`try
    set oldDelims to AppleScript's text item delimiters
    set AppleScript's text item delimiters to "\`\`\`"
    tell application "Safari"
      set theData to {name, URL} of tabs of window 1
      set theData to theData as string
      set AppleScript's text item delimiters to oldDelims
      return theData
    end tell
  end try`);
  const entries = data.split("```");
  const names = entries.slice(0, entries.length / 2);
  const urls = entries.slice(entries.length / 2);
  return names.map((name, i) => ({ name: name, url: urls[i] }));
};

/**
 * Gets the URL of the active tab in Arc.
 *
 * @returns A promise which resolves to the URL of the active tab as a string.
 */
const getArcURL = async (): Promise<{ name: string; url: string }> => {
  const data = await runAppleScript(`try
      set oldDelims to AppleScript's text item delimiters
      set AppleScript's text item delimiters to "\`\`\`"
          tell application "Arc"
              set theData to {title, URL} of active tab of window 1
              set theData to theData as string
              set AppleScript's text item delimiters to oldDelims
              return theData
          end tell
      end try`);
  const entries = data.split("```");
  if (entries.length === 2) {
    return { name: entries[0], url: entries[1] };
  }
  return { name: "", url: "" };
};

/**
 * Gets the name and URL of each tab in Arc.
 * @returns A promise which resolves to an array of objects containing the name and URL of each tab.
 */
const getArcTabs = async (): Promise<{ name: string; url: string }[]> => {
  const data = await runAppleScript(`try
    set oldDelims to AppleScript's text item delimiters
    set AppleScript's text item delimiters to "\`\`\`"
    tell application "Arc"
      set theData to {title, URL} of tabs of window 1
      set theData to theData as string
      set AppleScript's text item delimiters to oldDelims
      return theData
    end tell
  end try`);
  const entries = data.split("```");
  const names = entries.slice(0, entries.length / 2);
  const urls = entries.slice(entries.length / 2);
  return names.map((name, i) => ({ name: name, url: urls[i] }));
};

/**
 * Gets the URL of the active tab in iCab.
 *
 * @returns A promise which resolves to the URL of the active tab as a string.
 */
const getiCabURL = async (): Promise<{ name: string; url: string }> => {
  const data = await runAppleScript(`try
      set oldDelims to AppleScript's text item delimiters
      set AppleScript's text item delimiters to "\`\`\`"
          tell application "iCab"
              set theData to {name, url} of document 1
              set theData to theData as string
              set AppleScript's text item delimiters to oldDelims
              return theData
          end tell
      end try`);
  const entries = data.split("```");
  if (entries.length === 2) {
    return { name: entries[0], url: entries[1] };
  }
  return { name: "", url: "" };
};

/**
 * Gets the name and URL of each tab in iCab.
 * @returns A promise which resolves to an array of objects containing the name and URL of each tab.
 */
const getiCabTabs = async (): Promise<{ name: string; url: string }[]> => {
  const data = await runAppleScript(`try
    set oldDelims to AppleScript's text item delimiters
    set AppleScript's text item delimiters to "\`\`\`"
    tell application "iCab"
      set theData to {name, url} of tabs of window 1
      set theData to theData as string
      set AppleScript's text item delimiters to oldDelims
      return theData
    end tell
  end try`);
  const entries = data.split("```");
  const names = entries.slice(0, entries.length / 2);
  const urls = entries.slice(entries.length / 2);
  return names.map((name, i) => ({ name: name, url: urls[i] }));
};

/**
 * Gets the URL of the active tab in a Chromium-based browser.
 *
 * @param browserName The name of the browser.
 * @returns A promise which resolves to the URL of the active tab as a string.
 */
const getChromiumURL = async (browserName: string): Promise<{ name: string; url: string }> => {
  const data = await runAppleScript(`try
      set oldDelims to AppleScript's text item delimiters
      set AppleScript's text item delimiters to "\`\`\`"
          tell application "${browserName}"
              set tabIndex to active tab index of window 1
              set theData to {title, URL} of tab tabIndex of window 1
              set theData to theData as string
              set AppleScript's text item delimiters to oldDelims
              return theData
          end tell
      end try`);
  const entries = data.split("```");
  if (entries.length === 2) {
    return { name: entries[0], url: entries[1] };
  }
  return { name: "", url: "" };
};

/**
 * Gets the name and URL of each tab in a Chromium-based browser.
 * @param browserName The name of the browser.
 * @returns A promise which resolves to an array of objects containing the name and URL of each tab.
 */
const getChromiumTabs = async (browserName: string): Promise<{ name: string; url: string }[]> => {
  const data = await runAppleScript(`try
    set oldDelims to AppleScript's text item delimiters
    set AppleScript's text item delimiters to "\`\`\`"
      tell application "${browserName}"
        set theData to {title, URL} of tabs of window 1
        set theData to theData as string
        set AppleScript's text item delimiters to oldDelims
        return theData
      end tell
    end try`);
  const entries = data.split("```");
  const names = entries.slice(0, entries.length / 2);
  const urls = entries.slice(entries.length / 2);
  return names.map((name, i) => ({ name: name, url: urls[i] }));
};

/**
 * Gets the URL of the active tab in Orion.
 * @returns A promise which resolves to the URL of the active tab as a string.
 */
const getOrionURL = async (): Promise<{ name: string; url: string }> => {
  const data = await runAppleScript(`try
    set oldDelims to AppleScript's text item delimiters
    set AppleScript's text item delimiters to "\`\`\`"
    tell application "Orion"
      set theData to {name, URL} of current tab of window 1
      set theData to theData as string
      set AppleScript's text item delimiters to oldDelims
      return theData
    end tell
  end try`);
  const entries = data.split("```");
  if (entries.length === 2) {
    return { name: entries[0], url: entries[1] };
  }
  return { name: "", url: "" };
};

/**
 * Gets the name and URL of each tab in a Chromium-based browser.
 * @param browserName The name of the browser.
 * @returns A promise which resolves to an array of objects containing the name and URL of each tab.
 */
const getOrionTabs = async (): Promise<{ name: string; url: string }[]> => {
  const data = await runAppleScript(`try
    set oldDelims to AppleScript's text item delimiters
    set AppleScript's text item delimiters to "\`\`\`"
      tell application "Orion"
        set theData to {name, URL} of tabs of window 1
        set theData to theData as string
        set AppleScript's text item delimiters to oldDelims
        return theData
      end tell
    end try`);
  const entries = data.split("```");
  const names = entries.slice(0, entries.length / 2);
  const urls = entries.slice(entries.length / 2);
  return names.map((name, i) => ({ name: name, url: urls[i] }));
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
  "Orion",
];

/**
 * Gets the current URL of the active tab of the specified browser.
 *
 * @param browserName The name of the browser application. Must be a member of {@link SupportedBrowsers}.
 * @returns A promise which resolves to the URL of the active tab of the browser as a string.
 */
export const getCurrentURL = async (browserName: string): Promise<{ name: string; url: string }> => {
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
    case "Orion":
      return getOrionURL();
      break;
  }
  return { name: "", url: "" };
};

/**
 * Gets the current tabs of the specified browser.
 * @param browserName The name of the browser application. Must be a member of {@link SupportedBrowsers}.
 * @returns A promise which resolves to the tabs of the browser as an array of objects with `name` and `url` properties.
 */
export const getCurrentTabs = async (browserName: string): Promise<{ name: string; url: string }[]> => {
  switch (browserName) {
    case "Safari":
      return getSafariTabs();
      break;
    case "Google Chrome":
    case "Microsoft Edge":
    case "Brave Browser":
    case "Opera":
    case "Vivaldi":
    case "Chromium":
      return getChromiumTabs(browserName);
      break;
    case "Arc":
      return getArcTabs();
      break;
    case "iCab":
      return getiCabTabs();
      break;
    case "Orion":
      return getOrionTabs();
      break;
  }
  return [];
};

/**
 * Gets the raw HTML of a URL.
 *
 * @param URL The URL to get the HTML of.
 * @returns The HTML as a string.
 */
export const getURLHTML = async (URL: string): Promise<string> => {
  return await runAppleScript(`use framework "Foundation"
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
 * Gets the visible text of a URL.
 *
 * @param URL The URL to get the visible text of.
 * @returns A promise resolving to the visible text as a string.
 */
export const getTextOfWebpage = async (URL: string): Promise<string> => {
  const html = await getURLHTML(URL);
  const filteredString = html
    .replaceAll(/(<br ?\/?>|[\n\r]+)/g, "\n")
    .replaceAll(
      /(<script[\s\S\n\r]+?<\/script>|<style[\s\S\n\r]+?<\/style>|<nav[\s\S\n\r]+?<\/nav>|<link[\s\S\n\r]+?<\/link>|<form[\s\S\n\r]+?<\/form>|<button[\s\S\n\r]+?<\/button>|<!--[\s\S\n\r]+?-->|<select[\s\S\n\r]+?<\/select>|<[\s\n\r\S]+?>)/g,
      "\n"
    )
    .replaceAll(/[\n\r]{2,}/g, "\r")
    .replaceAll(/(\([^A-Za-z0-9\n]*\)|(?<=[,.!?%*])[,.!?%*]*?\s*[,.!?%*])/g, " ");
  return filteredString;
};
