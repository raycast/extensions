import { Clipboard, LocalStorage, Toast, getFrontmostApplication, showHUD, showToast } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export enum UserType {
  Teacher = "teach",
  Student = "stud",
}

export enum PopupType {
  LogIn = "log-in",
  SignUp = "sign-up",
}

export interface Sequence {
  name: string;
  description: string;
  icon: string;
  shortcut: Shortcut;
}

export interface Shortcut {
  keystrokes: string;
  modifiers: string[];
}

export const copyLastSignedUpEmail = async (userType: UserType) => {
    const name = await LocalStorage.getItem<string>(nameLocalStorageKey());
    if (!name) {
      await showToast(Toast.Style.Failure, "Couldn't find a name");
      return;
    }  
    const lastEmail = await LocalStorage.getItem<string>(lastSignedUpEmailStorageKey(name, userType));
    if (!lastEmail) {
      await showToast(Toast.Style.Failure, "Couldn't find any signed up email for " + name + " " + userType);
      return;
    }
    const _ = await Clipboard.copy(lastEmail);
    await showToast(Toast.Style.Success, "Copied " + lastEmail + " to clipboard");
}
export const autofillPopup = async (popupType: PopupType, userType: UserType) => {
  var dummy;

  const tabSequence = "ASCII character 9";
  const enterSequence = "ASCII character 13";

  // get name
  const name = await LocalStorage.getItem<string>(nameLocalStorageKey());
  if (!name) {
      await showToast(Toast.Style.Failure, "Run the Tutero Accounts command first to set your name");
      return;
  }

  if (popupType === PopupType.LogIn) {
    // login flow
    const lastEmail = await LocalStorage.getItem<string>(lastSignedUpEmailStorageKey(name, userType));
    if (!lastEmail) {
      await showToast(Toast.Style.Failure, "Couldn't find any signed up email for " + name + " " + userType);
      return;
    }
    dummy = await Clipboard.paste(lastEmail);
    dummy = await runShortcutSequence(tabSequence);
    dummy = await Clipboard.paste("123123");
    dummy = await runShortcutSequence(enterSequence);
  } else {
    // signup flow
    // get last stored date (stored in month-day format)
    const lastDate = await LocalStorage.getItem<string>(dateLocalStorageKey());
    const today = new Date();
    const month = today.toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
    const day = today.getDay();
    const storeDate = month + day;
    
    // if this is the first time we're storing, or last stored date is not today, reset the account number
    if (!lastDate || lastDate !== storeDate) {
      await LocalStorage.setItem(accountNumberLocalStorageKey(name, userType), 0);
      await LocalStorage.setItem(dateLocalStorageKey(), storeDate);
    }
  
    // get account number
    var accountNumber = await LocalStorage.getItem<number>(accountNumberLocalStorageKey(name, userType));
    if(accountNumber == undefined) {
      accountNumber = 0;
    }
    accountNumber+=1
    dummy = await LocalStorage.setItem(accountNumberLocalStorageKey(name, userType), accountNumber);
  
    const password = "123123"
    const accountName = titleCaseWord(name) + titleCaseWord(userType) + accountNumber + " " + titleCaseWord(month) + day
    const accountEmail = name.toLowerCase() + userType + accountNumber + '.' + month + day + '@yopmail.com';
    
    dummy = await Clipboard.paste(accountName);
    dummy = await runShortcutSequence(tabSequence);
    dummy = await Clipboard.paste(accountEmail);
    dummy = await runShortcutSequence(tabSequence);
    dummy = await Clipboard.paste(password);
    dummy = await runShortcutSequence(tabSequence);
    dummy = await Clipboard.paste(password);
    dummy = await runShortcutSequence(enterSequence);
    dummy = await LocalStorage.setItem(lastSignedUpEmailStorageKey(name, userType), accountEmail);
  }
  const toast = await showToast(Toast.Style.Success, "It's called ZacMagic™! :D");
}

export function nameLocalStorageKey() {
  return `name`;
}

export function accountNumberLocalStorageKey(name: String, userType: UserType) {
  return `${name}-${userType}-account-number`;
}

export function dateLocalStorageKey() {
  return `date`;
}

export function lastSignedUpEmailStorageKey(name: String, userType: UserType) {
  return `${name}-${userType}-last-signed-up-email`;
}

function titleCaseWord(word: string) {
  if (!word) return word;
  return word[0].toUpperCase() + word.substr(1).toLowerCase();
}

export const runShortcutSequence = async (keystrokes: String) => {
  /* Runs each shortcut of a sequence in rapid succession. */
  const currentApplication = await getFrontmostApplication();
  const keystroke = (function getKeystroke() {
    if (keystrokes.includes("ASCII character")) {
      return `(${keystrokes})`;
    }
    if (keystrokes.includes("key code")) {
      return keystrokes;
    }
    return `"${keystrokes}"`;
  })();
  // const modifier = shortcut.modifiers.length
  //   ? `using ${shortcut.modifiers.length > 1 ? `[${shortcut.modifiers.join(", ")}]` : shortcut.modifiers[0]}`
  //   : "";
  const script = `tell application "${currentApplication.name}"
          tell application "System Events"
              keystroke ${keystroke}
          end tell
      end tell`;
  await runAppleScript(script);
};