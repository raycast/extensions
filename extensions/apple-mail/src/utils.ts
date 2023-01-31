import { runAppleScript } from "run-applescript";

export function toTitleCase(str: string) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
  });
}

export async function getEmailSubjectsAndIDs() {
  const messageFields =
    "subject, message id, sender, reply to, date sent, date received, deleted status, flagged status, junk mail status, read status";
  const contactInfo = await runAppleScript(`tell application "Mail"
    set oldDelims to AppleScript's text item delimiters
    set AppleScript's text item delimiters to "!a-m:"
    set theText to (({subject, message id, sender, reply to, date sent, date received, deleted status, flagged status, junk mail status, read status} of messages of every mailbox) & {"~a_m-"} & ({subject, message id, sender, reply to, date sent, date received, deleted status, flagged status, junk mail status, read status} of messages of inbox) & {"~a_m-"} & ({subject, message id, sender, reply to, date sent, date received, deleted status, flagged status, junk mail status, read status} of messages of trash mailbox) & {"~a_m-"} & ({subject, message id, sender, reply to, date sent, date received, deleted status, flagged status, junk mail status, read status} of messages of sent mailbox) & {"~a_m-"} & ({subject, message id, sender, reply to, date sent, date received, deleted status, flagged status, junk mail status, read status} of messages of junk mailbox) & {"~a_m-"} & ({subject, message id, sender, reply to, date sent, date received, deleted status, flagged status, junk mail status, read status} of messages of drafts mailbox)) as rich text
    set AppleScript's text item delimiters to oldDelims
    return theText
  end tell`);

  const messages: { [key: string]: string }[] = [];
  const ids: string[] = [];
  contactInfo.split("~a_m-").forEach((messagesData) => {
    const messageList = messagesData.split("!a-m:");
    const numFields = messageFields.split(", ").length;

    const numEntries = messageList.length;
    const startIndex = messagesData.startsWith("!a-m:") ? 1 : 0;
    const endIndex = messagesData.endsWith("!a-m:") ? -1 : 0;
    const numMessages = (numEntries - startIndex + endIndex) / numFields;

    for (let i = 0; i < numMessages; i++) {
      const messageData = {
        subject: messageList[i + 1],
        id: messageList[numMessages + i + startIndex],
        sender: messageList[numMessages * 2 + i + startIndex],
        replyTo: messageList[numMessages * 3 + i + startIndex],
        dateSent: messageList[numMessages * 4 + i + startIndex],
        dateReceived: messageList[numMessages * 5 + i + startIndex],
        deletedStatus: messageList[numMessages * 6 + i + startIndex],
        flaggedStatus: messageList[numMessages * 7 + i + startIndex],
        junkMailStatus: messageList[numMessages * 8 + i + startIndex],
        readStatus: messageList[numMessages * 9 + i + startIndex],
      };

      if (messageData.id != undefined && !ids.includes(messageData.id)) {
        messages.push(messageData);
        ids.push(messageData.id);
      }
    }
  });
  return messages;
}

export async function getEmailContentByID(id: string) {
  return await runAppleScript(`tell application "Mail"
    set customMailboxes to every mailbox
    set allMessages to (every message of customMailboxes & messages of inbox & messages of sent mailbox & messages of trash mailbox & messages of junk mailbox & messages of drafts mailbox)
    
    set theContent to null
    repeat with theItem in allMessages
      if message id of theItem = "${id}" then
        set theContent to content of theItem
        return theContent
      end if
    end repeat
  end tell`);
}

export async function deleteEmailByID(id: string) {
  await runAppleScript(`tell application "Mail"
    set customMailboxes to every mailbox
    set allMessages to (every message of customMailboxes & messages of inbox & messages of sent mailbox & messages of trash mailbox & messages of junk mailbox & messages of drafts mailbox)
    
    repeat with theItem in allMessages
      if message id of theItem = "${id}" then
        move theItem to trash mailbox
        return
      end if
    end repeat
  end tell`);
}

export async function setEmailReadByID(id: string) {
  await runAppleScript(`tell application "Mail"
    set customMailboxes to every mailbox
    set allMessages to (every message of customMailboxes & messages of inbox & messages of sent mailbox & messages of trash mailbox & messages of junk mailbox & messages of drafts mailbox)
    
    repeat with theItem in allMessages
      if message id of theItem = "${id}" then
        set read status of theItem to true
        return
      end if
    end repeat
  end tell`);
}

export async function setEmailUnreadByID(id: string) {
  await runAppleScript(`tell application "Mail"
    set customMailboxes to every mailbox
    set allMessages to (every message of customMailboxes & messages of inbox & messages of sent mailbox & messages of trash mailbox & messages of junk mailbox & messages of drafts mailbox)
    
    repeat with theItem in allMessages
      if message id of theItem = "${id}" then
        set read status of theItem to false
        return
      end if
    end repeat
  end tell`);
}

export async function junkEmailByID(id: string) {
  await runAppleScript(`tell application "Mail"
    set customMailboxes to every mailbox
    set allMessages to (every message of customMailboxes & messages of inbox & messages of sent mailbox & messages of trash mailbox & messages of junk mailbox & messages of drafts mailbox)
    
    repeat with theItem in allMessages
      if message id of theItem = "${id}" then
        set junk mail status of theItem to true
        return
      end if
    end repeat
  end tell`);
}

export async function unjunkEmailByID(id: string) {
  await runAppleScript(`tell application "Mail"
    set customMailboxes to every mailbox
    set allMessages to (every message of customMailboxes & messages of inbox & messages of sent mailbox & messages of trash mailbox & messages of junk mailbox & messages of drafts mailbox)
    
    repeat with theItem in allMessages
      if message id of theItem = "${id}" then
        set junk mail status of theItem to false
        return
      end if
    end repeat
  end tell`);
}

export async function flagEmailByID(id: string) {
  await runAppleScript(`tell application "Mail"
    set customMailboxes to every mailbox
    set allMessages to (every message of customMailboxes & messages of inbox & messages of sent mailbox & messages of trash mailbox & messages of junk mailbox & messages of drafts mailbox)
    
    repeat with theItem in allMessages
      if message id of theItem = "${id}" then
        set flagged status of theItem to true
        return
      end if
    end repeat
  end tell`);
}

export async function unflagEmailByID(id: string) {
  await runAppleScript(`tell application "Mail"
    set customMailboxes to every mailbox
    set allMessages to (every message of customMailboxes & messages of inbox & messages of sent mailbox & messages of trash mailbox & messages of junk mailbox & messages of drafts mailbox)
    
    repeat with theItem in allMessages
      if message id of theItem = "${id}" then
        set flagged status of theItem to false
        return
      end if
    end repeat
  end tell`);
}

export async function openEmailByID(id: string) {
  await runAppleScript(`tell application "Mail"
    set customMailboxes to every mailbox
    set allMessages to (every message of customMailboxes & messages of inbox & messages of sent mailbox & messages of trash mailbox & messages of junk mailbox & messages of drafts mailbox)
    
    repeat with theItem in allMessages
      if message id of theItem = "${id}" then
        activate
        open theItem
        return
      end if
    end repeat
  end tell`);
}

export async function getMailboxNamesByID() {
  return runAppleScript(`tell application "Mail"
    set customMailboxes to every mailbox
    set allMessages to (every message of customMailboxes & messages of inbox & messages of sent mailbox & messages of trash mailbox & messages of junk mailbox & messages of drafts mailbox)
    set theMailboxes to {}
    repeat with theItem in allMessages
      copy {message id, name of mailbox} of theItem to end of theMailboxes
    end repeat
    return theMailboxes
  end tell`);
}

export async function restoreEmailByID(id: string) {
  return runAppleScript(`tell application "Mail"
  set customMailboxes to every mailbox
  set allMessages to (every message of customMailboxes & messages of inbox & messages of sent mailbox & messages of trash mailbox & messages of junk mailbox & messages of drafts mailbox)
  
  set theContent to null
  repeat with theItem in allMessages
    if message id of theItem = "${id}" then
      set deleted status of theItem to false
      move theItem to inbox
      return
    end if
  end repeat
end tell`);
}

export async function createNewEmail() {
  return await runAppleScript(`tell application "Mail"
    make new outgoing message
    activate
  end tell`);
}

export async function getAccountNames() {
  return await runAppleScript(`tell application "Mail"
    get name of accounts
  end tell`);
}

export async function eraseDeletedItems(account?: string) {
  await runAppleScript(`set originalAppState to false
  set originalWindowState to true
  
  tell application "System Events"
    set theNames to name of application processes
    if "Mail" is in theNames then
      set originalAppState to true
    end if
  end tell

  tell application "Mail"
    if (count of windows) > 0 and miniaturized of front window is false then
      set originalWindowState to false
    end if
    reopen
    set newViewer to make new message viewer
    activate window 1
  end tell

  tell application "System Events"
    tell application process "Mail"
      tell menu item "${
        account || "In All Accounts"
      }…" of menu "Erase Deleted Items" of menu item "Erase Deleted Items" of menu "Mailbox" of menu bar item "Mailbox" of menu bar 1 to click
      tell button "Erase" of sheet 1 of window 1 to click
    end tell
  end tell

  tell application "Mail"
    close window of newViewer
    if originalAppState = false then
      quit
      return
    end if
    
    if originalWindowState = true and (count of windows) > 0 then
      set miniaturized of window 1 to true
    end if
  end tell`);
}

export async function eraseJunkItems() {
  await runAppleScript(`set originalAppState to false
  set originalWindowState to true
  
  tell application "System Events"
    set theNames to name of application processes
    if "Mail" is in theNames then
      set originalAppState to true
    end if
  end tell
  
  tell application "Mail"
    if (count of windows) > 0 and miniaturized of front window is false then
      set originalWindowState to false
    end if
    reopen
    set newViewer to make new message viewer
    activate window 1
  end tell
  
  tell application "System Events"
    tell application process "Mail"
      tell menu item "Erase Junk Mail" of menu "Mailbox" of menu bar item "Mailbox" of menu bar 1 to click
      tell button "Erase" of sheet 1 of window 1 to click
    end tell
  end tell
  
  tell application "Mail"
    close window of newViewer
    if originalAppState = false then
      quit
      return
    end if
    
    if originalWindowState = true and (count of windows) > 0 then
      set miniaturized of window 1 to true
    end if
  end tell`);
}
