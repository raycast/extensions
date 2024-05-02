import { runAppleScript } from "@raycast/utils";

export interface Option {
  key: string;
  title: string;
  subtitle: string;
}

export interface Tab {
  url: string;
  title: string;
}

export const OPTIONS = [
  {
    key: "MD_LIST",
    title: "Markdown List",
    subtitle: "- [Page Title](https://example.com)",
  },
  {
    key: "MD_LINK",
    title: "Markdown Link",
    subtitle: "[Page Title](https://example.com)",
  },
  {
    key: "TITLE_LINK",
    title: "Title and Link",
    subtitle: "Page Title https://example.com",
  },
  {
    key: "TITLE_ONLY",
    title: "Title Only",
    subtitle: "Page Title",
  },
  {
    key: "LINK_ONLY",
    title: "Link Only",
    subtitle: "https://example.com",
  },
];

export const getSafariTabs = async (): Promise<Tab[]> => {
  const script = `set output to ""
    tell application "Safari"
        set numWindows to number of windows
        
        repeat with w from 1 to numWindows
            
            set numTabs to number of tabs in window w
            
            repeat with t from 1 to numTabs
                
                set tabName to name of tab t of window w
                set tabURL to URL of tab t of window w
                
                set output to output & tabURL & "{{||||}}" & tabName & linefeed as string
            end repeat
        end repeat
    end tell`;

  const res = await runAppleScript(script);

  return res
    .split("\n")
    .filter((t) => t)
    .map((tab: string) => {
      const [url, title] = tab.split("{{||||}}");
      return { url, title };
    });
};

export const getSafariTab = async (): Promise<Tab[]> => {
  const script = `set output to ""
    tell application "Safari" to set currentTabUrl to URL of front document
    tell application "Safari" to set currentTabTitle to name of front document
    set output to currentTabUrl & "{{||||}}" & currentTabTitle`;

  const res = await runAppleScript(script);

  const [url, title] = res.split("{{||||}}");
  return [{ url, title }];
};

export const formatTabs = (tabs: Tab[], format: string): string => {
  const links: string[] = [];
  const markdownAsList = format === "MD_LIST";

  tabs.forEach(function (tab: { title: string; url: string }) {
    if (!tab) return;
    const url = tab.url;

    switch (format) {
      case "MD_LIST":
      case "MD_LINK":
        links.push(`${markdownAsList ? "- " : ""}[${tab.title}](${url})`);
        break;
      case "LINK_ONLY":
        links.push(url);
        break;
      case "TITLE_ONLY":
        links.push(tab.title);
        break;
      case "TITLE_LINK":
        links.push(`${tab.title} ${url}`);
        break;
      default:
        links.push(`${tab.title} ${url}`);
    }
  });

  let joiner = "\n\n";
  if (markdownAsList) joiner = "\n";

  return links.join(joiner);
};
