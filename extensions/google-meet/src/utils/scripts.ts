/**
 * Get all tabs urls based on the browser
 *
 * @param browserName selected browser name
 *
 * @returns all tabs urls
 */
export const getOpenedUrlsScript = (browserName: string): string => `
  set titleString to ""
  
  tell application "${browserName}"
    set window_list to every window

    repeat with the_window in window_list
      set tab_list to every tab in the_window
      repeat with the_tab in tab_list
        set the_url to the URL of the_tab
        set titleString to titleString & the_url & ","
      end repeat
    end repeat

    return titleString

  end tell
`;

// Easy way to access the focused window when the meet link opens
export const getOpenedBrowserScript = `
    set cmd to "lsappinfo metainfo | grep -E -o 'Google Chrome|Safari|Mozilla Firefox|Microsoft Edge|Opera|QQ|Sogou Explorer|Yandex|Brave|Firefox Developer Edition' | head -1"

    set frontmostBrowser to do shell script cmd

    return frontmostBrowser
`;
