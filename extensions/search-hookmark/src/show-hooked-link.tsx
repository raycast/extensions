import { fetchHookedBookmarksFromAppleScript, HookedBookmarksList } from "./utils/hookmark";
import { Bookmark } from "./utils/type";

export default function Command() {
  const script = `
    set linefeed to ASCII character 10
    
    set _output to ""
    
    tell application "Hookmark"
      set currentBookmark to bookmark from active window
      set _hookedlist to hooked bookmarks of currentBookmark
      set _bookmark_count to count of _hookedlist
      
      if _bookmark_count > 0 then
        repeat with i from 1 to _bookmark_count
          set _name to name of item i of _hookedlist
          set _path to path of item i of _hookedlist
          set _address to address of item i of _hookedlist
          
          set _output to (_output & _name & linefeed & _address & linefeed & _path)
          
          if i < _bookmark_count then
            set _output to (_output & linefeed)
          end if
        end repeat
      end if
    end tell
    
    return _output
  `;
  const bookmarks = fetchHookedBookmarksFromAppleScript(script);

  return <HookedBookmarksList bookmarks={bookmarks} />;
}

export function ShowHookedSubmenu(bookmark: Bookmark) {
  const script = `
    set linefeed to ASCII character 10
    set _output to ""
    tell application "Hookmark"
      set currentBookmark to make bookmark with properties {name:"${bookmark.title}", address:"${bookmark.address}"}
      set _hookedlist to hooked bookmarks of currentBookmark
      set _bookmark_count to count of _hookedlist
      if _bookmark_count > 0 then
        repeat with i from 1 to _bookmark_count
          set _name to name of item i of _hookedlist
          set _path to path of item i of _hookedlist
          set _address to address of item i of _hookedlist
          set _output to (_output & _name & linefeed & _address & linefeed & _path)
          if i < _bookmark_count then
            set _output to (_output & linefeed)
          end if
        end repeat
      end if
    end tell
    
    return _output
  `;
  const bookmarks = fetchHookedBookmarksFromAppleScript(script);

  return <HookedBookmarksList bookmarks={bookmarks} />;
}
