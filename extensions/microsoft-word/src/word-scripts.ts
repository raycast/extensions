const jsonHandler = `
use framework "Foundation"
use scripting additions
on jsonFor(theList)
  set theArray to current application's NSArray's arrayWithArray:theList
  set jsonData to current application's NSJSONSerialization's dataWithJSONObject:theArray options:0 |error|:(missing value)
  if jsonData is missing value then error "Could not read Word's response."
  return (current application's NSString's alloc()'s initWithData:jsonData encoding:(current application's NSUTF8StringEncoding)) as text
end jsonFor
`;

export const activeDocumentScript = `${jsonHandler}
on run argv
  if application id "com.microsoft.Word" is not running then error "Open a document in Microsoft Word first."
  tell application id "com.microsoft.Word"
    if (count of documents) is 0 then error "Open a document in Microsoft Word first."
    set doc to active document
    set docName to name of doc
    set docIdentity to full name of doc
    set docPath to path of doc
    set isSaved to saved of doc
    set isTracking to track revisions of doc
    set isReadOnly to read only of doc
  end tell
  return my jsonFor({docName, docIdentity, docPath, isSaved, isTracking, isReadOnly})
end run
`;

export const documentTextScript = `${jsonHandler}
on run argv
  if application id "com.microsoft.Word" is not running then error "Open a document in Microsoft Word first."
  tell application id "com.microsoft.Word"
    if (count of documents) is 0 then error "Open a document in Microsoft Word first."
    set doc to active document
    if full name of doc is not item 1 of argv then error "The active document changed. Refresh and try again."
    if item 2 of argv is "selection" then
      set selectedText to content of selection
      if selectedText is "" then error "Select some text in Word first."
    else
      set selectedText to content of text object of doc
    end if
  end tell
  return my jsonFor({selectedText})
end run
`;

export const toggleTrackChangesScript = `${jsonHandler}
on run argv
  if application id "com.microsoft.Word" is not running then error "Open a document in Microsoft Word first."
  tell application id "com.microsoft.Word"
    if (count of documents) is 0 then error "Open a document in Microsoft Word first."
    set doc to active document
    if (count of argv) > 0 then
      if full name of doc is not item 1 of argv then error "The active document changed. Refresh and try again."
    end if
    if (count of argv) > 1 then
      set track revisions of doc to (item 2 of argv is "on")
    else
      set track revisions of doc to not (track revisions of doc)
    end if
    set trackingState to track revisions of doc
  end tell
  return my jsonFor({trackingState})
end run
`;

export const createDocumentScript = `${jsonHandler}
on run argv
  tell application id "com.microsoft.Word"
    set doc to make new document
    try
      set content of text object of doc to item 1 of argv
    on error errorMessage number errorNumber
      close doc saving no
      error errorMessage number errorNumber
    end try
    set docName to name of doc
    activate object doc
    activate
  end tell
  return my jsonFor({docName})
end run
`;
