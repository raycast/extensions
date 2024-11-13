import { ActionPanel, Action, Detail, Clipboard, closeMainWindow } from "@raycast/api";
import { exec } from "child_process";

export default function Command() {
 // Immediately process clipboard with commas by default
 processClipboard(true);

 return (
   <Detail
     markdown="✅ Emails extracted to clipboard with commas. Use ⌘↩ for space-separated format."
     actions={
       <ActionPanel>
         <Action
           title="Paste Emails"
           onAction={async () => {
             await closeMainWindow();
             exec('osascript -e \'tell application "System Events" to keystroke "v" using command down\'');
           }}
         />
         <Action
           title="Copy Without Commas (Space Separated)"
           shortcut={{ modifiers: ["cmd"], key: "return" }}
           onAction={() => processClipboard(false)}
         />
       </ActionPanel>
     }
   />
 );
}

async function processClipboard(withCommas: boolean) {
 try {
   const clipboardText = await Clipboard.readText();
   
   if (!clipboardText) {
     await Clipboard.copy("No text found in clipboard");
     return;
   }

   const emailRegex = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
   const emails = clipboardText.match(emailRegex);
   
   if (!emails || emails.length === 0) {
     await Clipboard.copy("No email addresses found");
     return;
   }

   const separator = withCommas ? ", " : " ";
   const emailString = emails.join(separator);
   await Clipboard.copy(emailString);
 } catch (error) {
   console.error(error);
   await Clipboard.copy("Error processing clipboard");
 }
}
