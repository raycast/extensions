import { splitter } from "../common/config";

export const Scripts = {
  chrome: `
  	tell application "Google Chrome"
		if not application "Google Chrome" is running then
			return ""
		end if
		set activeTabIndex to active tab index of window 1
		set activeTabURL to URL of tab activeTabIndex of window 1
		set activeTabTitle to title of tab activeTabIndex of window 1
		return (activeTabURL & "${splitter}" & activeTabTitle)
	end tell
	`,
  arc: `
	tell application "Arc"
		if not application "Arc" is running then
			return ""
		end if
		activate
		 tell application "System Events" to tell process "Arc"
		    set frontmost to true
		    set the_title to name of windows's item 1
		    set the_title to (do shell script "echo " & quoted form of the_title & " | tr '[' ' '")
		    set the_title to (do shell script "echo " & quoted form of the_title & " | tr ']' ' '")
	    	end tell

		    tell application "System Events"
		    keystroke "l" using command down
		    keystroke "c" using command down
		    key code 53 
			end tell
			delay 0.5
			set activeTabURL to the clipboard
  		return (activeTabURL & "${splitter}" & the_title)
	end tell 
  `,
  safari: `tell application "Safari"
	if not application "Safari" is running then
		return ""
	end if
	set activeTab to current tab of window 1
	set activeTabURL to URL of activeTab
	set activeTabTitle to name of activeTab
	return (activeTabURL & "${splitter}" & activeTabTitle)
end tell`,

  firefox: `tell application "Firefox"
    		if not application "Firefox" is running then
  			return ""
  		end if
    		activate
		 tell application "System Events" to tell process "firefox"
		    set frontmost to true
		    set the_title to name of windows's item 1
		    set the_title to (do shell script "echo " & quoted form of the_title & " | tr '[' ' '")
		    set the_title to (do shell script "echo " & quoted form of the_title & " | tr ']' ' '")
	    	end tell

		    tell application "System Events"
		    keystroke "l" using command down
		    keystroke "c" using command down
		    key code 53 
		    end tell
			delay 0.5
			set activeTabURL to the clipboard
  		return (activeTabURL & "${splitter}" & the_title)
    	end tell`,

  edge: `
  	tell application "Microsoft Edge"
		if not application "Microsoft Edge" is running then
			return ""
		end if
		set activeTabIndex to active tab index of window 1
		set activeTabURL to URL of tab activeTabIndex of window 1
		set activeTabTitle to title of tab activeTabIndex of window 1
		return (activeTabURL & "${splitter}" & activeTabTitle)
	end tell
	`,
};

export const expression_strict =
  /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;

export const expression = /\b((?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+(?:\/[^\s]*)?)\b/gi;
