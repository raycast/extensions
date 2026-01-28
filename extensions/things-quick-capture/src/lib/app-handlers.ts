import { runAppleScript } from "run-applescript";
import { CapturedContext } from "./types";

// Use newline as delimiter - can't appear in single-line AppleScript returns
const DELIM = "\n";

interface AppHandler {
  getContext: () => Promise<CapturedContext>;
}

function parseResult(result: string): [string, string] {
  const idx = result.indexOf(DELIM);
  if (idx === -1) return [result, ""];
  return [result.slice(0, idx), result.slice(idx + 1)];
}

const browserHandler = (appName: string): AppHandler => ({
  async getContext() {
    const result = await runAppleScript(`
      tell application "${appName}"
        set tabURL to URL of active tab of front window
        set tabTitle to title of active tab of front window
      end tell
      return tabTitle & "\n" & tabURL
    `);
    const [title, url] = parseResult(result);
    return { appName, title, url, type: "browser" };
  },
});

const safariHandler: AppHandler = {
  async getContext() {
    const result = await runAppleScript(`
      tell application "Safari"
        set docURL to URL of front document
        set docTitle to name of front document
      end tell
      return docTitle & "\n" & docURL
    `);
    const [title, url] = parseResult(result);
    return { appName: "Safari", title, url, type: "browser" };
  },
};

const mailHandler: AppHandler = {
  async getContext() {
    const result = await runAppleScript(`
      tell application "Mail"
        set theMessage to item 1 of (selection as list)
        set theSubject to subject of theMessage
        set theID to message id of theMessage
        set theURL to "message://%3c" & theID & "%3e"
      end tell
      return theSubject & "\n" & theURL
    `);
    const [title, url] = parseResult(result);
    return { appName: "Mail", title, url, type: "email" };
  },
};

const outlookHandler: AppHandler = {
  async getContext() {
    const result = await runAppleScript(`
      tell application "Microsoft Outlook"
        set selMessages to selected objects
        if selMessages is not {} then
          set theMessage to item 1 of selMessages
          set theSubject to subject of theMessage
          set theID to id of theMessage
          return theSubject & "\n" & "outlook://open?id=" & theID
        end if
      end tell
      return "\n"
    `);
    const [title, url] = parseResult(result);
    return {
      appName: "Microsoft Outlook",
      title: title || "Outlook Email",
      url: url || null,
      type: "email",
    };
  },
};

const slackHandler: AppHandler = {
  async getContext() {
    const title = await runAppleScript(`
      tell application "System Events"
        tell process "Slack"
          return name of front window
        end tell
      end tell
    `);
    return { appName: "Slack", title, url: null, type: "message" };
  },
};

const finderHandler: AppHandler = {
  async getContext() {
    const result = await runAppleScript(`
      tell application "Finder"
        set theSelection to selection as alias list
        if theSelection is not {} then
          set theFile to item 1 of theSelection
          return (name of theFile) & "\n" & (URL of theFile)
        else
          set folderTarget to target of front window as alias
          return (name of front window) & "\n" & (URL of folderTarget)
        end if
      end tell
    `);
    const [title, url] = parseResult(result);
    return { appName: "Finder", title, url, type: "file" };
  },
};

const notesHandler: AppHandler = {
  async getContext() {
    const result = await runAppleScript(`
      tell application "Notes"
        set theNote to selection
        if theNote is not {} then
          set theNote to item 1 of theNote
          return (name of theNote) & "\n" & "notes://showNote?identifier=" & (id of theNote)
        end if
      end tell
      return "\n"
    `);
    const [title, url] = parseResult(result);
    return {
      appName: "Notes",
      title: title || "Note",
      url: url || null,
      type: "note",
    };
  },
};

const whatsappHandler: AppHandler = {
  async getContext() {
    const title = await runAppleScript(`
      tell application "System Events"
        tell process "WhatsApp"
          return name of front window
        end tell
      end tell
    `);
    return { appName: "WhatsApp", title, url: null, type: "message" };
  },
};

const handlers: Record<string, AppHandler> = {
  Safari: safariHandler,
  "Google Chrome": browserHandler("Google Chrome"),
  "Brave Browser": browserHandler("Brave Browser"),
  Arc: browserHandler("Arc"),
  Mail: mailHandler,
  "Microsoft Outlook": outlookHandler,
  Slack: slackHandler,
  WhatsApp: whatsappHandler,
  Finder: finderHandler,
  Notes: notesHandler,
};

export function getAppHandler(appName: string): AppHandler | null {
  return handlers[appName] || null;
}
