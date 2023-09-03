/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  interface ObjectConstructor {
    keys<T extends object>(obj: T): (keyof T)[];
  }

  interface JSON {
    parse<T = unknown>(text: string, reviver?: (this: any, key: string, value: any) => any): T;
  }

  type ReplaceProperties<
    T extends Record<string, any>,
    R extends {
      [K in keyof T]?: GetTypeStructure<T[K]>;
    },
  > = Omit<T, keyof R> & Pick<R, keyof T>;
}

type GetTypeStructure<T> = T extends Record<string, any> ? { [K in keyof T]?: GetTypeStructure<T[K]> } : any;

export {};
