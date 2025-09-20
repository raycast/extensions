import { runAppleScript } from "run-applescript";

export async function getIndentedRows(documentNumber: number) {
  return await runAppleScript(`tell application "Bike"
        set textList to {}
        repeat with theRow in rows of document ${documentNumber}
            set theSpacer to ""
            repeat with index from 2 to level of the theRow
                set theSpacer to theSpacer & "  "
            end repeat
            copy theSpacer & text content of theRow to the end of textList
            copy "\\n" to the end of textList
        end repeat
        return textList
    end tell`);
}

// ** New Documents
export async function createNewDocument() {
  await runAppleScript(`tell application "Bike"
      activate  
      make new document
    end tell`);
}

export async function newDocumentFromClipboard(clipboardLines: string[]) {
  await runAppleScript(`tell application "Bike"
    activate
    set newDoc to make new document
    
    try
      -- Attempt to delete every row (only works with license)
      tell newDoc to delete every row
    on error
      -- No license, just clear every row
      repeat with rowItem in rows of newDoc
        set name of rowItem to ""
      end repeat
    end try

    -- Get lines of clipboard content
    set docData to {${clipboardLines}}

    -- Add the clipboard content to the beginning of the document
    repeat with lineItem in docData
      tell newDoc to make new row at front of rows with properties {name: lineItem}
    end repeat
  end tell`);
}

// ! Templates
export async function createDailyBikeTemplate() {
  await runAppleScript(`tell application "Bike"
    activate
    set docName to (current date) as string
    set newDoc to make new document with properties {name: docName}

    try
      -- Attempt to delete every row (only works with license)
      tell newDoc to delete every row
    on error
      -- No license, just clear every row
      repeat with rowItem in rows of newDoc
        set name of rowItem to ""
      end repeat
    end try

    tell newDoc
      set startRow to make new row with properties {name: docName, level: 1}

      make new row with properties {name: "Today's Goals:", level: 2}
      make new row with properties {name: "1. ", level: 3}
      make new row with properties {name: "2. ", level: 3}
      make new row with properties {name: "3. ", level: 3}

      make new row with properties {name: "", level: 2}

      make new row with properties {name: "Today's Tasks:", level: 2}
      make new row with properties {name: "1. ", level: 3}
      make new row with properties {name: "2. ", level: 3}
      make new row with properties {name: "3. ", level: 3}

      make new row with properties {name: "", level: 2}

      make new row with properties {name: "Reminders:", level: 2}
      make new row with properties {name: "1. ", level: 3}
      make new row with properties {name: "2. ", level: 3}
      make new row with properties {name: "3. ", level: 3}

      make new row with properties {name: "", level: 2}

      make new row with properties {name: "Notes:", level: 2}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}
    end tell

    move startRow to front of rows of newDoc
  end tell`);
}

export async function createCornellNotesTemplate() {
  await runAppleScript(`tell application "Bike"
    activate
    set docName to ((current date) as string) & " - Notes Summary"
    set newDoc to make new document with properties {name: docName}

    try
      -- Attempt to delete every row (only works with license)
      tell newDoc to delete every row
    on error
      -- No license, just clear every row
      repeat with rowItem in rows of newDoc
        set name of rowItem to ""
      end repeat
    end try

    tell newDoc
      set startRow to make new row with properties {name: docName, level: 1}

      make new row with properties {name: "Class/Subject: ", level: 2}
      make new row with properties {name: "Topic: ", level: 2}

      make new row with properties {name: "Notes", level: 2}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}

      make new row with properties {name: "", level: 2}

      make new row with properties {name: "Questions:", level: 2}
      make new row with properties {name: "1. ", level: 3}
      make new row with properties {name: "2. ", level: 3}
      make new row with properties {name: "3. ", level: 3}

      make new row with properties {name: "", level: 2}

      make new row with properties {name: "Summary:", level: 2}
      make new row with properties {name: "- ", level: 3}
    end tell

    move startRow to front of rows of newDoc
  end tell`);
}

export async function createShoppingListTemplate() {
  await runAppleScript(`tell application "Bike"
    activate
    set docName to ((current date) as string) & " - Shopping List"
    set newDoc to make new document with properties {name: docName}

    try
      -- Attempt to delete every row (only works with license)
      tell newDoc to delete every row
    on error
      -- No license, just clear every row
      repeat with rowItem in rows of newDoc
        set name of rowItem to ""
      end repeat
    end try

    tell newDoc
      set startRow to make new row with properties {name: docName, level: 1}

      make new row with properties {name: "Dairy:", level: 2}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}

      make new row with properties {name: "", level: 2}

      make new row with properties {name: "Fruits & Vegetables:", level: 2}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}

      make new row with properties {name: "", level: 2}

      make new row with properties {name: "Grains:", level: 2}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}

      make new row with properties {name: "", level: 2}

      make new row with properties {name: "Meats:", level: 2}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}

      make new row with properties {name: "", level: 2}

      make new row with properties {name: "Drinks:", level: 2}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}

      make new row with properties {name: "", level: 2}

      make new row with properties {name: "Frozen:", level: 2}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}

      make new row with properties {name: "", level: 2}

      make new row with properties {name: "Other:", level: 2}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}
      make new row with properties {name: "- ", level: 3}
    end tell

    move startRow to front of rows of newDoc
  end tell`);
}

// ** Modification
export async function deleteRowFromDocument(rowNumber: number, documentNumber: number) {
  await runAppleScript(`tell application "Bike"
        delete row ${rowNumber} of document ${documentNumber}
    end tell`);
}

export async function appendFromClipboard(clipboardLines: string[], documentNumber: number) {
  runAppleScript(`tell application "Bike"
    activate
    -- Get the most recent document
    set theDoc to document ${documentNumber}

    -- Get lines of clipboard content
    set docData to {${clipboardLines}}

    -- Add the clipboard content to the end of the document
    repeat with lineItem in docData
      tell theDoc to make new row with properties {name: lineItem}
    end repeat
  end tell`);
}

export async function setBikeBackgroundColor(color: string) {
  await runAppleScript(`tell application "Bike"
      activate
      try
          set background color to ${color}
      end try
    end tell`);
}

export async function setBikeForegroundColor(color: string) {
  await runAppleScript(`tell application "Bike"
      activate
      try
          set foreground color to ${color}
      end try
    end tell`);
}

// ** Copying
export async function copyRowText(rowNumber: number, documentNumber: number) {
  await runAppleScript(`tell application "Bike"
        set theText to text content of row ${rowNumber} of document ${documentNumber}
        set the clipboard to theText
    end tell`);
}

export async function copyEntireRowContents(rowNumber: number, documentNumber: number) {
  await runAppleScript(`tell application "Bike"
        set theContent to text content of row ${rowNumber} of document ${documentNumber}
        repeat with childRow in (entire contents of row ${rowNumber} of document ${documentNumber} as list)
            set theTabs to "  "
            repeat with index from 1 to level of childRow
              set theTabs to theTabs & "  "
            end repeat 
            set theContent to theContent & "\\n" & theTabs & text content of childRow
        end repeat
        set the clipboard to theContent
    end tell`);
}

export async function copyRowURL(rowNumber: number, documentNUmber: number) {
  await runAppleScript(`tell application "Bike"
        set theURL to URL of row ${rowNumber} of document ${documentNUmber}
        set the clipboard to theURL
    end tell`);
}

export async function copyDocumentURL(documentNumber: number) {
  await runAppleScript(`tell application "Bike"
    set theURL to URL of document ${documentNumber}
    set the clipboard to theURL
  end tell`);
}

export async function copySelectedRowURL(documentNumber: number) {
  await runAppleScript(`tell application "Bike"
    set theText to URL of selection row of document ${documentNumber}
    set the clipboard to theText
  end tell`);
}

export async function extractLinksFromDocument(documentNumber: number): Promise<number> {
  return parseInt(
    await runAppleScript(`tell application "Bike"
    set linkList to {}
    set attributeList to {link, view link} of (attribute runs whose link contains ":" or view link contains ":") of text content of rows of document ${documentNumber}
    
    -- Loop through each attribute kind (i.e. link, view link)
    repeat with attributeRunList in attributeList
      -- Loop through each matching attribute run
      repeat with attributeRun in attributeRunList
        -- Loop through each value
        repeat with value in attributeRun
          set theURL to contents of value
          if theURL is not missing value then
            copy theURL to the end of linkList
          end if
        end repeat
      end repeat
    end repeat
    
    set oldDelims to AppleScript's text item delimiters
    set AppleScript's text item delimiters to "\\n"
    set the clipboard to linkList as text
    set AppleScript's text item delimiters to oldDelims

    return count of linkList
  end tell`)
  );
}

// ** Navigation
export async function goToRowInDocument(rowNumbeer: number, documentNumber: number) {
  await runAppleScript(`tell application "Bike"
        activate
        select document ${documentNumber} at row ${rowNumbeer} of document ${documentNumber}
    end tell`);
}

export async function closeAllButCurrentDocument() {
  await runAppleScript(`tell application "Bike"
    activate
    set docZero to document 1
    set theCount to (count of documents)
    repeat while theCount is greater than 1
      try
        close last document saving ask
      end try
      set theCount to (theCount - 1)
    end repeat
  end tell`);
}

export async function forceCloseAllButCurrentDocument() {
  await runAppleScript(`tell application "Bike"
    activate
    set docZero to document 1
    repeat while (count of documents) is greater than 1
      try
        close last document saving no
      end try
    end repeat
  end tell`);
}

export async function minimizeBikeWindows() {
  await runAppleScript('tell application "Bike" to set the miniaturized of every window to true');
}
