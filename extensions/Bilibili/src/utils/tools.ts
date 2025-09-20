export function formatUrl(url: string) {
  return url.replace("http://", "https://").replace(/^\/\//, "https://");
}

export function secondToDate(second: number) {
  const h = Math.floor(second / 3600);
  const m = Math.floor((second / 60) % 60);
  const s = Math.floor(second % 60);

  return `${h ? String(h).padStart(2, "0") + ":" : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatNumber(number: number | undefined) {
  return number ? (number > 9999 ? `${(number / 1000).toFixed(1)}K` : String(number)) : "";
}

export function removeEmHTMLTag(str: string) {
  return str.replace(/<em class=["']keyword["']>(.+?)<\/em>/g, "$1");
}

export function generateRemainderScript(title: string, uploaderName: string, url: string) {
  return `
    tell application "Reminders"
      try
        get list "Raycast Bilibili"
        set mylist to list "Raycast Bilibili"
        tell mylist
          make new reminder with properties {name:"${title} - ${uploaderName}", body:"${formatUrl(url)}"}
        end tell
      on error
        make new list with properties {name:"Raycast Bilibili"}
        set mylist to list "Raycast Bilibili"
        tell mylist
          make new reminder with properties {name:"${title} - ${uploaderName}", body:"${formatUrl(url)}"}
        end tell
      end try
    end tell`
}
