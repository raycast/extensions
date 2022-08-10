import {Item} from "./types";

export function filterFct(item: Item, searchText: string) {
    return item.title.includes(searchText)
}
