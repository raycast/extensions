import { runAppleScript } from "@raycast/utils";

export type Tab = {
  index: number;
  title: string;
  status: "running" | "idle";
};

export const getTabs = async (): Promise<Tab[]> => {
  const rawTabTitles = await runAppleScript(`
set tabTitles to {}

tell application "iTerm"
	tell current window
		repeat with aTab in tabs
			tell aTab
				set tabTitle to current session's name
			end tell
			set end of tabTitles to tabTitle
		end repeat
	end tell
end tell

return tabTitles
  `);

  const tabTitles = rawTabTitles.split(", ");

  return tabTitles.map((title: string, index: number) => {
    return {
      index,
      title,
      status: title.endsWith("(-bash)") || title.endsWith("(-zsh)") || title.endsWith("(-fish)") ? "idle" : "running",
    };
  });
};

export const focusTab = (tabIndex: number) => {
  return runAppleScript(`
set targetTabIndex to ${tabIndex}

tell application "iTerm"
	tell current window
		set tabIndex to 0
		
		repeat with aTab in tabs
			if tabIndex is equal to targetTabIndex then
				select aTab
				activate
				exit repeat
			end if
			
			set tabIndex to tabIndex + 1
		end repeat
	end tell
end tell
  `);
};

export const openNewTab = () => {
  return runAppleScript(`
tell application "iTerm"
  tell current window
    create tab with default profile
    activate
	end tell
end tell
  `);
};
