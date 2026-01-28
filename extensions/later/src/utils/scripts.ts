import { splitter } from "../common/config";

export const Scripts = {
  chrome: `
	tell application "System Events"
		set isRunning to (name of processes) contains "Google Chrome"
	end tell

		if isRunning then
			tell application "Google Chrome"
			set activeTabIndex to active tab index of window 1
			set activeTabURL to URL of tab activeTabIndex of window 1
			set activeTabTitle to title of tab activeTabIndex of window 1
			return (activeTabURL & "${splitter}" & activeTabTitle)
		end tell
	else
		return ""
	end if
	`,
  arc: `
  	tell application "System Events"
  		set isRunning to (name of processes) contains "Arc"
	end tell

	if isRunning then
		tell application "Arc"
			set currentURL to URL of active tab of window 1
			set currentTitle to title of active tab of window 1
			return (currentURL & "${splitter}" & currentTitle)
		end tell
	else
		return ""
	end if
  `,
  safari: `
  	tell application "Safari"
		if not application "Safari" is running then
			return ""
		end if
		set activeTab to current tab of window 1
		set activeTabURL to URL of activeTab
		set activeTabTitle to name of activeTab
		return (activeTabURL & "${splitter}" & activeTabTitle)
	end tell
	`,

  firefox: `
  	tell application "System Events"
  		set isRunning to (name of processes) contains "firefox"
	end tell

	if isRunning then
		tell application "Firefox"
			activate
			delay 0.5 -- Give Firefox some time to activate
		end tell

	tell application "System Events"
		tell process "firefox"
			set frontmost to true
			set the_title to name of window 1
			set the_title to (do shell script "echo " & quoted form of the_title & " | tr '[' ' '")
			set the_title to (do shell script "echo " & quoted form of the_title & " | tr ']' ' '")
		end tell
		keystroke "l" using command down
		delay 0.2 -- Give some time for the keystroke
		keystroke "c" using command down
		delay 0.5 -- Give some time for the clipboard to update
		set activeTabURL to the clipboard
		key code 53
	end tell
	
		return (activeTabURL & "${splitter}" & the_title)
	else
		return ""
	end if
	`,

  edge: `
  	tell application "System Events"
  		set isRunning to (name of processes) contains "Microsoft Edge"
	end tell

	if isRunning then
		tell application "Microsoft Edge"
			set activeTabIndex to active tab index of window 1
			set activeTabURL to URL of tab activeTabIndex of window 1
			set activeTabTitle to title of tab activeTabIndex of window 1
			return (activeTabURL & "${splitter}" & activeTabTitle)
		end tell
	else
		return ""
	end if
	`,
};

export const expression_strict =
  /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;

export const expression = /\b((?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+(?:\/[^\s]*)?)\b/gi;
