import { showToast, Toast, Detail, ActionPanel, Action } from "@raycast/api";
import React from "react";
import { runAppleScript } from "@raycast/utils";
import { checkExcel } from "./ai-utils";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Reading Excel...",
  });

  try {
    const ok = await checkExcel();
    if (!ok) {
      toast.style = Toast.Style.Failure;
      toast.title = "Excel not running";
      return;
    }

    const script = `
tell application "Microsoft Excel"
  if not (exists active workbook) then return "No workbook open"
  
  tell active sheet
    set output to "Sheet: " & name & return & return
    
    try
      set sel to selection
      set selAddr to get address of sel
      set output to output & "Selection: " & selAddr & return
      
      set vals to value of sel
      if class of vals is list then
        repeat with row in vals
          if class of row is list then
            set rowStr to ""
            repeat with cell in row
              if cell is missing value then
                set rowStr to rowStr & "[empty] "
              else
                set rowStr to rowStr & (cell as text) & " "
              end if
            end repeat
            set output to output & rowStr & return
          else
            set output to output & (row as text) & return
          end if
        end repeat
      else
        set output to output & "Value: " & (vals as text) & return
      end if
    on error
      set output to output & "Could not read selection" & return
    end try
    
    try
      set rng to used range
      set output to output & return & "Used range: " & (get address of rng)
    end try
    
    return output
  end tell
end tell`;

    const result = await runAppleScript(script);

    toast.style = Toast.Style.Success;
    toast.title = "Done";

    return (
      <Detail
        markdown={`## Excel Data\n\n\`\`\`\n${result}\n\`\`\``}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={result} title="Copy" />
          </ActionPanel>
        }
      />
    );
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Error";
    const msg = e instanceof Error ? e.message : String(e);

    return (
      <Detail
        markdown={`## Error\n\n${msg}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={msg} title="Copy Error" />
          </ActionPanel>
        }
      />
    );
  }
}
