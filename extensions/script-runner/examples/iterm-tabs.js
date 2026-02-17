
module.exports = {
  name: "iTerm Tabs", 
  description: "Search and switch iTerm tabs",
  
  fetch: async () => {
    // We can't use run-applescript directly here because it's a Raycast dependency 
    // and we are running in a VM context. We need to use 'child_process' or similar
    // to run osascript, OR we need the host to expose capabilities.
    // However, for this specific refactor, since the user wants to use the existing logic 
    // as a "workflow", we might need to handle the execution environment.
    
    // BUT the previous implementation used `run-applescript` which is an npm package.
    // In the VM, `require` is shimmed.
    
    // Let's use `osascript` via `child_process` which is standard node.
    const { exec } = require("child_process");
    const util = require("util");
    const execPromise = util.promisify(exec);

    const script = `
        tell application "iTerm"
            set resultList to {}
            repeat with w in windows
                set w_id to id of w
                set t_index to 0
                repeat with t in tabs of w
                    set t_index to t_index + 1
                    repeat with s in sessions of t
                        set s_id to id of s
                        set s_name to name of s
                        set end of resultList to (w_id as string) & "|" & (t_index as string) & "|" & "Tab " & (t_index as string) & "|" & s_name & "|" & s_id
                    end repeat
                end repeat
            end repeat
            
            set AppleScript's text item delimiters to "\\n"
            return resultList as string
        end tell
    `;
    
    // Escape the script for shell execution
    // This is rough, usually easier to write to a temp file, but let's try direct
    // Since we are inside a node script, we can do:
    try {
        const { stdout } = await execPromise(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
        
        return stdout.split("\n").filter(Boolean).map((line) => {
            console.log(line);
            const parts = line.split("|");
            // "WindowID|TabIndex|TabName|SessionName|SessionID"
            if (parts.length < 5) return null;
            const [windowId, tabIndex, tabName, sessionName, sessionId] = parts;
            return {
                name: sessionName,
                windowId,
                tabIndex,
                sessionId,
                id: `${windowId}-${tabIndex}-${sessionId}`
            };
        }).filter(Boolean);
    } catch (e) {
        console.error("Error fetching iTerm tabs", e);
        return [];
    }
  },

  doActions: async (item) => {
    const { exec } = require("child_process");
    const util = require("util");
    const execPromise = util.promisify(exec);

    const script = `
      tell application "iTerm"
          set targetWindow to (first window whose id is ${item.windowId})
          select tab ${item.tabIndex} of targetWindow
          activate
      end tell
    `;
    
    await execPromise(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
  }
};
