import { runAppleScriptSync } from "run-applescript";
import { List, Action, ActionPanel } from "@raycast/api";
import { Bookmark } from "./utils/type";
import { getFavicon } from "@raycast/utils";
import { openInHook } from "./utils/hookmark";

export default function Command() {
  const response = runAppleScriptSync(`
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
    
            set _output to (_output & "{\\"title\\": \\"" & _name & "\\", \\"address\\": \\"" & _address & "\\", \\"path\\": \\"" & _path & "\\" }")

            if i < _bookmark_count then
                set _output to (_output & ",\n")
            else
                set _output to (_output & "\n")
            end if
        end repeat
      end if
    end tell

    return "[\n" & _output & "\n]"
  `);
  const data = JSON.parse(response);
  return (
    <List isShowingDetail>
      <List.Section title={`Hooked Bookamrks:`}>
        {data?.map((bookmark: Bookmark) => (
          <List.Item
            title={bookmark.title}
            key={bookmark.address}
            icon={getFavicon(bookmark.address)}
            detail={
              <List.Item.Detail
                isLoading={false}
                markdown={
                  bookmark.path.endsWith(".pdf") ||
                  bookmark.path.endsWith(".jpg") ||
                  bookmark.path.endsWith(".jpeg") ||
                  bookmark.path.endsWith(".png")
                    ? `<img src="${encodeURIComponent(bookmark.path)}" alt="${bookmark.title}" height="190" />`
                    : `[${bookmark.title}](${bookmark.address})`
                }
                //  markdown={`<img> src="${encodeURIComponent(bookmark.path)}" alt="${bookmark.title}" height="190" />`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Title" text={bookmark.title} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Link title="Address" text={bookmark.address} target={bookmark.address} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Path" text={bookmark.path} />
                    <List.Item.Detail.Metadata.Separator />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action title="Open In Hookmark" onAction={() => openInHook(bookmark.title, bookmark.address)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export function ShowHookedSubmenu(bookmark: Bookmark) {
  const response = runAppleScriptSync(`
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
      
              set _output to (_output & "{\\"title\\": \\"" & _name & "\\", \\"address\\": \\"" & _address & "\\", \\"path\\": \\"" & _path & "\\" }")
  
              if i < _bookmark_count then
                  set _output to (_output & ",\n")
              else
                  set _output to (_output & "\n")
              end if
          end repeat
        end if
      end tell
  
      return "[\n" & _output & "\n]"
    `);
  const data = JSON.parse(response);
  return (
    <List isShowingDetail>
      <List.Section title={`Hooked Bookamrks:`}>
        {data?.map((bookmark: Bookmark) => (
          <List.Item
            title={bookmark.title}
            key={bookmark.address}
            icon={getFavicon(bookmark.address)}
            detail={
              <List.Item.Detail
                isLoading={false}
                markdown={`<img> src="${encodeURIComponent(bookmark.path)}" alt="${bookmark.title}" height="190" />`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Title" text={bookmark.title} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Link title="Address" text={bookmark.address} target={bookmark.address} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Path" text={bookmark.path} />
                    <List.Item.Detail.Metadata.Separator />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action title="Open In Hookmark" onAction={() => openInHook(bookmark.title, bookmark.address)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
