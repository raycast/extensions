/* eslint-disable @typescript-eslint/no-explicit-any */

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
  }

  interface JSON {
    /**
     * Converts a JavaScript Object Notation (JSON) string into an object.
     * @param text A valid JSON string.
     * @param reviver A function that transforms the results. This function is called for each member of the object.
     * If a member contains nested objects, the nested objects are transformed before the parent object is.
     */
    parse<T = unknown>(text: string, reviver?: (this: any, key: string, value: any) => any): T;
  }

  export type AllPreferences = Preferences &
    Preferences.Authenticator &
    Preferences.CreateFolder &
    Preferences.CreateSend &
    Preferences.GeneratePassword &
    Preferences.GeneratePasswordQuick &
    Preferences.LockVault &
    Preferences.LogoutVault &
    Preferences.ReceiveSend &
    Preferences.Search &
    Preferences.SearchSends;

  type RecordOfAny = Record<string, any>;
  type RecordOfStrings = Record<string, string>;
  type RecursiveNonOptional<T> = { [K in keyof T]-?: RecursiveNonOptional<T[K]> };
  type MaybePromise<T> = T | Promise<T>;
  type Nullable<T> = T | null | undefined;
  type Falsy = false | "" | 0 | null | undefined;
}

export {};
