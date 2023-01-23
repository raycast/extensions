import { showToast, Toast, Cache, popToRoot } from "@raycast/api";
import { getCommands, processEntryAdditions, processEntryRemovals } from "./utils";

const cache = new Cache();

export default async function Main() {
    const cachedPages = cache.get("manPages")?.split("\n")
    popToRoot()
    const pages = await getCommands()
    processEntryRemovals(pages)
    processEntryAdditions(pages)

    let numChanged = 0;
    if (cachedPages) {
        numChanged = pages.length - cachedPages.length
    }
    
    showToast({ style: Toast.Style.Success, title: "Man Page Entries Updated", message: numChanged >= 0 ? `${numChanged} entries added` : `${-numChanged} entries removed` })
}