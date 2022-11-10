import { ObjectEntries } from "types";

export type ObjectEntries<Obj> = { [Key in keyof Obj]: [Key, Obj[Key]] }[keyof Obj][];

declare global {
  interface ObjectConstructor {
    /**
     `Object.keys` that preserves the type of the keys
     *
     * If you wish to have the original behavior (`key` as strings), type your mapper argument, like so:
     * 
     * @example
     * Object.keys(obj).map((key: string) => ...)
     */
    keys<T extends object>(obj: T): (keyof T)[];
    /** `Object.entries` that preserves the type of the keys */
    typedEntries<T extends object>(obj: T): ObjectEntries<T>;
  }
}

export {};
