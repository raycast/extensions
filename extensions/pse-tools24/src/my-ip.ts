import { showHUD, Clipboard } from "@raycast/api";
import {execSync} from "child_process"

export default async function main() {
  const command =  `ADDR=$(dig -4 TXT +short o-o.myaddr.l.google.com @ns1.google.com | sed -e 's/^"//' -e 's/"$//')
  echo $ADDR`
  
  const ip = execSync(command, {encoding: "utf-8"}).trim()
  await Clipboard.copy(ip);
  await showHUD(`IP ${ip}`);
}
