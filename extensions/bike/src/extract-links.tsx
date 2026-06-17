import { useEffect } from "react";
import { popToRoot, showHUD } from "@raycast/api";
import checkBikeInstalled from "./index";
import { extractLinksFromDocument } from "./scripts";

export default function main() {
  const error_alert = checkBikeInstalled();
  if (error_alert !== undefined) {
    return error_alert;
  }

  useEffect(() => {
    Promise.resolve(extractLinksFromDocument(1)).then((count: number) =>
      showHUD(`Copied ${count} ${count == 1 ? "Link" : "Links"} To Clipboard`).then(() => Promise.resolve(popToRoot()))
    );
  }, []);
}
