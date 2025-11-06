import { runAppleScript } from "@raycast/utils";
import TurndownService from "turndown";

export const getFeeds = async () => {
  const response = await runAppleScript(`
        set output to ""

        tell application "NetNewsWire"
        set allAccounts to every account
        repeat with nthAccount in allAccounts
            set accountName to name of nthAccount
            set userFeeds to allFeeds of nthAccount
            repeat with nthFeed in userFeeds
            set feedname to name of nthFeed
            set feedUrl to url of nthFeed
            set homepageUrl to homepage url of nthFeed
            set iconUrl to icon url of nthFeed
            set faviconUrl to favicon url of nthFeed
            set articleCount to count (get every article of nthFeed)
            set readCount to count (get every article of nthFeed where read is true)
            set starCount to count (get every article of nthFeed where starred is true)
            
            set output to output & accountName & "|||" & feedname & "|||" & feedUrl & "|||" & iconUrl & "|||" & faviconUrl & "|||" & articleCount & "|||" & readCount & "|||" & starCount & linefeed
            end repeat
        end repeat
        end tell

        return output
    `);
  const feeds = response
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => {
      const [account, name, url, iconUrl, faviconUrl, totalArticles, readArticles, starredArticles] = line.split("|||");
      const icon = iconUrl !== "missing value" ? iconUrl : faviconUrl !== "missing value" ? faviconUrl : null;
      return {
        account,
        name,
        url,
        totalArticles: parseInt(totalArticles),
        readArticles: parseInt(readArticles),
        starredArticles: parseInt(starredArticles),
        icon,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return feeds;
};

const turndownService = new TurndownService();
export const getArticles = async (feedName: string) => {
  const response = await runAppleScript(`
        -- Helper function
        on replaceText(theText, searchString, replacementString)
            set AppleScript's text item delimiters to searchString
            set theItems to text items of theText
            set AppleScript's text item delimiters to replacementString
            set theText to theItems as string
            set AppleScript's text item delimiters to ""
            return theText
        end replaceText
        
        set targetFeed to quoted form of ${feedName}
        set output to ""
        
        tell application "NetNewsWire"
            set allAccounts to every account
            repeat with nthAccount in allAccounts
            set userFeeds to allFeeds of nthAccount
            repeat with nthFeed in userFeeds
                if name of nthFeed is targetFeed then
                set allArticles to every article of nthFeed
                
                repeat with nthArticle in allArticles
                    set articleId to id of nthArticle
                    set articleTitle to title of nthArticle
                    set articleUrl to url of nthArticle
                    set isRead to read of nthArticle
                    set isStarred to starred of nthArticle
                    set textContent to contents of nthArticle
                    set htmlContent to html of nthArticle
                    
                    -- Replace newlines with placeholder
                    set textContent to my replaceText(textContent, linefeed, "<<NEWLINE>>")
                    set textContent to my replaceText(textContent, return, "<<NEWLINE>>")
                    set htmlContent to my replaceText(htmlContent, linefeed, "<<NEWLINE>>")
                    set htmlContent to my replaceText(htmlContent, return, "<<NEWLINE>>")
                    
                    set output to output & articleId & "|||" & articleTitle & "|||" & articleUrl & "|||" & isRead & "|||" & isStarred & "|||" & textContent & "|||" & htmlContent & linefeed
                end repeat
                
                return output
                end if
            end repeat
            end repeat
        end tell
        
        return "Feed not found"
    `);

  const articles = response
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => {
      const [id, title, url, isRead, isStarred, textContent, htmlContent] = line.split("|||");
      const content =
        textContent.replace(/<<NEWLINE>>/g, "\n") ||
        turndownService.turndown(htmlContent.replace(/<<NEWLINE>>/g, "\n"));
      return {
        id,
        title,
        url,
        isRead: isRead === "true",
        isStarred: isStarred === "true",
        content,
      };
    })
    .filter(Boolean); // Remove nulls
  return articles;
};
