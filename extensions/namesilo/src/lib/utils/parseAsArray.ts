import { ArrOrObjOrNull } from "../types";

export function parseAsArray<T>(item: ArrOrObjOrNull<T> | undefined) {
    return !item ? [] : (item instanceof Array ? item : [item]);
}