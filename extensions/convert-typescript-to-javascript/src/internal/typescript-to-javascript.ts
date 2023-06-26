import * as babel from "@babel/core";
import presetTypescript from "@babel/preset-typescript";

export async function covertTypeScriptToJavaScript(typescriptCode: string) {
  const output = babel.transform(typescriptCode, {
    filename: "clipboard.ts",
    presets: [presetTypescript],
  });

  if (!output?.code) {
    throw new Error("Failed to transform TypeScript to JavaScript");
  }

  return output.code;
}
