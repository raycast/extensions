import { ActionPanel, Detail, List, Action, getPreferenceValues, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { runAppleScript } from "run-applescript";
import { useEffect, useState } from "react";

type CommandPreferences = {
  primaryAction: "copy" | "paste";
};

interface Bookmark {
  title: string;
  address: string;
  path: string;
  file?: string;
}

export default function Command() {
  const [data, setData] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const preferences: CommandPreferences = getPreferenceValues();
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const jsonData = await runAppleScript(`
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
      
      set _output to (_output & "{\\"title\\": \\"" & _name & "\\", \\"address\\": \\"" & _address & "\\", \\"path\\": \\"" & _path & "\\" }")
      
      if i < _bookmark_count then
        set _output to (_output & ",\\n")
      else
        set _output to (_output & "\\n")
      end if
    end repeat
  end tell
  
  return "[\\n" & _output & "\\n]" 
  `);
        const parsedData = JSON.parse(jsonData);
        // console.log(parsedData);
        setData(parsedData);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);
  // console.log(data);
  return (
    <List isLoading={isLoading}>
      {data.map((bookmark) => (
        <List.Item
          title={bookmark.title}
          key={bookmark.address}
          icon="command-Icon.png"
          // icon={Icon.Link}
          accessories={[{ text: bookmark.address }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={bookmark.address} />
              <Action.CopyToClipboard title="Copy As File URL" content={bookmark.address} />
              <Action.CopyToClipboard
                title="Copy As Path"
                content={bookmark.path}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.Paste
                title="Paste Address"
                content={bookmark.address}
                shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              />
              {/* {preferences.primaryAction === "paste" && (
                <Action.Paste title="Paste Address" content={bookmark.address} />
              )} */}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
