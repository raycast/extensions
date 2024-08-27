import { showHUD, Clipboard } from "@raycast/api";
import got from "got";

export default async function main(props) {
  const numSentences = props.arguments.number || 3;
  const contentType = props.arguments.type || "sentences";
  const data = await got(`http://metaphorpsum.com/${contentType}/${numSentences}`).text();
  await Clipboard.copy(data);
  await showHUD(`Copied ${numSentences} sentence(s) to clipboard`);
}
