import { runAppleScriptSync } from "run-applescript";
import { List, Action, ActionPanel } from "@raycast/api";
import { Bookmark } from "./type";
import { getFavicon } from "@raycast/utils";
import fs from "fs";

export async function getBookmarks() {
  const response = runAppleScriptSync(`
    set _output to ""
  
    tell application "Hookmark"
      set _bookmark_name_list to name of every bookmark
      set _bookmark_addr_list to address of every bookmark
      set _bookmark_path_list to path of every bookmark
  
      set _bookmark_count to count of _bookmark_name_list
      
      repeat with i from 1 to _bookmark_count
        set _name to item i of _bookmark_name_list
        set _address to item i of _bookmark_addr_list
        set _path to item i of _bookmark_path_list
        
        set _output to (_output & "{\\"title\\": \\"" & _name & "\\", \\"address\\": \\"" & _address & "\\", \\"path\\": \\"" & _path & "\\"}")
        
        if i < _bookmark_count then
          set _output to (_output & ",\\n")
        else
          set _output to (_output & "\\n")
        end if
      end repeat
    end tell
    
    return "[\\n" & _output & "\\n]" 
    `);
  return response ? (JSON.parse(response) as Bookmark[]) : undefined;
}

export function openInHook(name: string, address: string) {
  const script = `
    tell application "Hookmark"
      set targetBookmark to make bookmark with properties {name:"${name}", address:"${address}"}
      invoke on targetBookmark
    end tell
  `;
  runAppleScriptSync(script);
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
                    <List.Item.Detail.Metadata.Label title="Address" text={bookmark.address} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Path" text={bookmark.path} />
                    <List.Item.Detail.Metadata.Separator />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action title="Open in Hookmark" onAction={() => openInHook(bookmark.title, bookmark.address)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export function getHookIconPath() {
  const HookPath = "/System/Volumes/Data/Applications/Hookmark.app";
  const HookPathSetapp = "/System/Volumes/Data/Applications/Setapp/Hookmark.app";
  let iconPath = "";
  if (fs.existsSync(HookPath)) {
    iconPath = HookPath;
  }

  if (fs.existsSync(HookPathSetapp)) {
    iconPath = HookPathSetapp;
  }
  return iconPath;
}
