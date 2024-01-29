import { showHUD, Clipboard } from "@raycast/api";

//this extension is used to copy the sharable link to the clipboard.
// links come in like this: https://app.hubspot.com/contacts/12345678/objects/0-1/views/all/list
// and we need to replace the portal ID (always the first number) with nothing and place a /l/ after the .com
export default async function main() {
  const link = await Clipboard.readText();
  console.log(link);
  //replace the portal ID from the url.
  var firstNumber = link.match(/\d+/)[0];
  var newLink = link.replace("/"+firstNumber, "");
  //add the /l/ after the .com
  var finalLink = newLink.replace(".com", ".com/l");
  console.log(finalLink);
  await Clipboard.copy(finalLink);
  await showHUD("Copied sharable link to clipboard");
}
