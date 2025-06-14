import { runAppleScript } from "@raycast/utils";
import { IBrowserDriver } from "./IBrowserDriver";
import { NotebookLMTab, RPCArgs, TabInfo, TabList, Tokens } from "../types";

const Browser = "Arc";
export class ArcBrowserDriver implements IBrowserDriver {
  public async openTab(): Promise<NotebookLMTab | null> {
    try {
      const notebookLMTabID = await runAppleScript(`
        tell application "System Events"
          set arcIsRunning to exists process "${Browser}"
        end tell
        
        if not arcIsRunning then
          tell application "${Browser}"
            launch
          end tell
        end if

        tell application "${Browser}"

          set hasActive to false
          try
            set currentTabID to id of active tab of front window
            set hasActive to true
          end try
          
          open location "https://notebooklm.google.com/"
          set gotID to false
          repeat until gotID
            try
              set notebookLMTabID to id of active tab of front window
              set gotID to true
            end try
          end repeat
          
          if hasActive then
            set tabIndex to 1
            repeat with aTab in every tab of window 1
              if id of aTab is currentTabID then
                tell tab tabIndex of window 1 to select
                exit repeat
              end if
              set tabIndex to tabIndex + 1
            end repeat
          end if
        end tell
        return notebookLMTabID
        `);
      return { id: notebookLMTabID };
    } catch (error) {
      console.error(`Error: ${error}`);
      return null;
    }
  }

  public async extractTokens(tab: NotebookLMTab): Promise<Tokens | null> {
    try {
      const response = await runAppleScript(`
        tell application "${Browser}"
          tell first window
            set allTabs to properties of every tab
            repeat with i from 1 to count of allTabs
              set currentTab to item i of allTabs
              if id of currentTab is "${tab.id}" then
                set js to "
                  (function() {
                    function extract(e, t) {
                        var m = new RegExp('\\"' + e + '\\":\\"([^\\\\\\"]+?)\\"').exec(t);
                        return m ? m[1] : '';
                    }
                    var xhr1 = new XMLHttpRequest();
                    xhr1.open('GET', 'https://notebooklm.google.com/', false);
                    xhr1.withCredentials = true;
                    xhr1.send(null);
                    var html = xhr1.responseText;
                    var at = extract('SNlM0e', html);
                    var bl = extract('cfb2h', html);
                    return JSON.stringify({ at: at, bl: bl });
                  })();
                "
                tell tab i
                  return execute javascript js
                end tell
              end if
            end repeat
          end tell
        end tell
        `);
      return JSON.parse(JSON.parse(response));
    } catch (error) {
      console.error(`Error extracting tokens: ${error}`);
      return null;
    }
  }

  private actionOnTab(tab: NotebookLMTab, action: string, activate: boolean = false): void {
    try {
      runAppleScript(`
        tell application "${Browser}"
          try
            if (count of windows) is 0 then
              make new window
            end if
            set tabIndex to 1
            repeat with aTab in every tab of first window
              if id of aTab is "${tab.id}" then
                tell tab tabIndex of window 1 to ${action}
                ${activate ? "activate" : ""}
                return tabIndex
              end if
              set tabIndex to tabIndex + 1
            end repeat
          on error errMsg number errNum
            return
          end try
        end tell
      `);
    } catch (error) {
      console.error(`Error: ${error}`);
    }
  }

  public async closeTab(tab: NotebookLMTab): Promise<void> {
    this.actionOnTab(tab, "close");
  }

  public async selectTab(tab: NotebookLMTab, activate: boolean): Promise<void> {
    this.actionOnTab(tab, "select", activate);
  }

  public async checkLogin(tab: NotebookLMTab): Promise<boolean> {
    try {
      const response = await runAppleScript(`
        tell application "${Browser}"
        if (count of windows) is 0 then make new window
        set isLogin to false
        
        tell first window
          set allTabs to properties of every tab
          repeat with i from 1 to count of allTabs
            set currentTab to item i of allTabs
            if id of currentTab is "${tab.id}" then
              set tabURL to URL of currentTab
              exit repeat
            end if
          end repeat
          if tabURL contains "https://notebooklm.google.com" then
            set isLogin to true
          end if
        end tell
        return isLogin
        end tell
        `);
      return JSON.parse(response);
    } catch (error) {
      console.error(`Error: ${error}`);
      return false;
    }
  }

  public async detectLogin(tab: NotebookLMTab, timeout: number = 120000): Promise<boolean> {
    try {
      const response = await runAppleScript(
        `
        tell application "${Browser}"
        if (count of windows) is 0 then make new window
        set isLogin to false
        
        tell first window
          repeat
            set allTabs to properties of every tab
            repeat with i from 1 to count of allTabs
              set currentTab to item i of allTabs
              if id of currentTab is "${tab.id}" then
                set tabURL to URL of currentTab
                exit repeat
              end if
            end repeat
            if tabURL contains "https://notebooklm.google.com" then
              set isLogin to true
              exit repeat
            end if
            delay 1
          end repeat
        end tell
        return isLogin
        end tell
        `,
        { timeout: timeout },
      );
      return JSON.parse(response);
    } catch (error) {
      console.error(`Error: ${error}`);
      return false;
    }
  }

  private async requestToNotebookLM(tab: NotebookLMTab, rpcId: string, args: RPCArgs): Promise<string> {
    try {
      const response = await runAppleScript(
        `
        tell application "${Browser}"
        try
          if (count of windows) is 0 then make new window
          set resultJSON to ""
  
          set currentTabURL to URL of active tab of front window
          
          tell first window
            set allTabs to properties of every tab
            repeat with i from 1 to count of allTabs
              set currentTab to item i of allTabs
              if id of currentTab is "${tab.id}" then
                set js to "
                  (function() {
                    // 1) RPC format
                    function formatRpc(rpc) {
                      return [[[rpc.id, JSON.stringify(rpc.args), null, 'generic']]];
                    }

                    // Function to send a single request
                    function sendRequest(arg) {
                      try {
                        var rpc = { id: '${rpcId}', args: arg };

                        // 2) URL / body assemble
                        var url = 'https://notebooklm.google.com/_/LabsTailwindUi/data/batchexecute'
                                + '?rpcids=' + rpc.id
                                + '&_reqid=' + (Math.floor(Math.random()*900000)+100000)
                                + '&bl=' + encodeURIComponent('${tab.tokens?.bl}');
                        var body = 'f.req=' + encodeURIComponent(JSON.stringify(formatRpc(rpc)))
                                  + '&at=' + encodeURIComponent('${tab.tokens?.at}');
          
                        // 3) Synchronous POST
                        var xhr = new XMLHttpRequest();
                        xhr.open('POST', url, false);
                        xhr.withCredentials = true;
                        xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded;charset=utf-8');
                        xhr.send(body);
                        var respText = xhr.responseText;
                        
                        // 4) Remove first two lines and parse JSON
                        var jsonText = respText.split('\\\\n').slice(2).join('\\\\n');
                        var payload = JSON.parse(jsonText);
                        return payload;
                      } catch (error) {
                        return null;
                      }
                    }

                    var argsList = ${JSON.stringify(args).replace(/"/g, '\\"')};
                    var results = argsList.map(sendRequest);
                    
                    return results;
                  })();
                "
                tell tab i
                  set resultJSON to execute javascript js
                end tell
                exit repeat
              end if
            end repeat
          end tell
          return resultJSON
        on error errMsg number errNum
          return "null"
        end try
        end tell
        `,
        { timeout: 120000 },
      );
      return response;
    } catch {
      return "null";
    }
  }

  public async fetchData(tab: NotebookLMTab): Promise<string> {
    const arg = [null, 1];
    return await this.requestToNotebookLM(tab, "wXbhsf", [arg]);
  }

  public async createNewNotebook(tab: NotebookLMTab): Promise<string> {
    const arg = ["", null, null, [2]];
    return await this.requestToNotebookLM(tab, "CCqFvf", [arg]);
  }

  public async deleteNotebook(tab: NotebookLMTab, notebookIds: string[]): Promise<void> {
    const args = notebookIds.map((notebookId) => [[notebookId], [2]]);
    await this.requestToNotebookLM(tab, "WWINqb", args);
  }

  public async deleteNotOwnedNotebook(tab: NotebookLMTab, notebookIds: string[]): Promise<void> {
    const args = notebookIds.map((notebookId) => [notebookId, [2]]);
    await this.requestToNotebookLM(tab, "fejl7e", args);
  }

  public async deleteSource(tab: NotebookLMTab, sourceIds: string[]): Promise<void> {
    const args = sourceIds.map((sourceId) => [[[sourceId]], [2]]);
    await this.requestToNotebookLM(tab, "tGMBJ", args);
  }

  public async editNotebookTitle(tab: NotebookLMTab, notebookId: string, title: string): Promise<void> {
    const arg = [notebookId, [[null, null, null, [null, title]]]];
    await this.requestToNotebookLM(tab, "s0tc2d", [arg]);
  }

  public async editSourceTitle(tab: NotebookLMTab, sourceId: string, title: string): Promise<void> {
    const arg = [null, [sourceId], [[[title]]]];
    await this.requestToNotebookLM(tab, "b7Wfje", [arg]);
  }

  public async uploadPasteText(tab: NotebookLMTab, notebookId: string, text: string): Promise<string> {
    const arg = [[[null, ["Pasted Text", text], null, 2, null, null, null, null, null, null, 1]], notebookId, [2]];
    return await this.requestToNotebookLM(tab, "izAoDd", [arg]);
  }

  public async fetchSummary(tab: NotebookLMTab, sourceIds: string[]): Promise<string> {
    const args = sourceIds.map((sourceId) => [[[[sourceId]]]]);
    return await this.requestToNotebookLM(tab, "tr032e", args);
  }

  public async getTabList(): Promise<TabList> {
    const response = await runAppleScript(`
        on escape_value(this_text)
          set AppleScript's text item delimiters to "\\\\"
          set the item_list to every text item of this_text
          set AppleScript's text item delimiters to "\\\\\\\\"
          set this_text to the item_list as string
          set AppleScript's text item delimiters to "\\""
          set the item_list to every text item of this_text
          set AppleScript's text item delimiters to "\\\\\\""
          set this_text to the item_list as string
          set AppleScript's text item delimiters to ""
          return this_text
        end escape_value
    
        set _current_tab_json to ""
        set _other_tabs_json to ""
        set activeTabId to ""

        tell application "${Browser}"
          if (count of windows) is 0 then
            make new window
            return "{ \\"currentTab\\": null, \\"others\\": [] }"
          end if
    
          tell first window
            try
              set activeTabId to id of active tab
            end try
            set allTabs to properties of every tab
          end tell

          set tabsCount to count of allTabs
          set otherTabsCount to 0
          
          repeat with i from 1 to tabsCount
            set _tab to item i of allTabs
            set _title to my escape_value(get title of _tab)
            set _url to get URL of _tab
            set _id to get id of _tab
            set _location to get location of _tab
              
            set tab_json to "{ \\"title\\": \\"" & _title & "\\", \\"url\\": \\"" & _url & "\\", \\"id\\": \\"" & _id & "\\", \\"location\\": \\"" & _location & "\\" }"

            if _id is activeTabId then
              set _current_tab_json to tab_json
            else
              if otherTabsCount > 0 then
                set _other_tabs_json to _other_tabs_json & ","
              end if
              set _other_tabs_json to _other_tabs_json & tab_json
              set otherTabsCount to otherTabsCount + 1
            end if
          end repeat
        end tell
        
        if _current_tab_json is "" then
          return "{ \\"others\\": [" & _other_tabs_json & "] }"
        else
          return "{ \\"currentTab\\": " & _current_tab_json & ", \\"others\\": [" & _other_tabs_json & "] }"
        end if
        `);
    return JSON.parse(response);
  }

  public async uploadTabs(tab: NotebookLMTab, tabList: TabInfo[], notebookId: string): Promise<void> {
    const args = tabList.map((tab) => {
      if (tab.url.includes("www.youtube.com/")) {
        return [[[null, null, null, null, null, null, null, [tab.url], null, null, 1]], notebookId, [2]];
      } else {
        return [[[null, null, [tab.url], null, null, null, null, null, null, null, 1]], notebookId, [2]];
      }
    });
    await this.requestToNotebookLM(tab, "izAoDd", args);
  }
}
