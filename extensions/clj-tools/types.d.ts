declare module "@yellowdig/cljs-tools" {
  export const edn = {
    encode: (input: string, keywordize?: boolean) => string,
    decode: (input: string, keywordize?: boolean) => string,
  };
}
