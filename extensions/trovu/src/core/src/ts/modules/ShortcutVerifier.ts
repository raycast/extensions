/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
export default class ShortcutVerifier {
  static checkIfHasUrl(shortcut) {
    if (!shortcut.url && !shortcut.deprecated) {
      return `Missing url in ${shortcut.namespace}.${shortcut.key}.`;
    }
  }
  static checkIfHasUrlAndNoInclude(shortcut) {
    if (!shortcut.url && !shortcut.deprecated && !shortcut.include) {
      return `Missing url in ${shortcut.namespace}.${shortcut.key}.`;
    }
  }
  static checkIfArgCountMatches(shortcut) {
    if (shortcut.url && shortcut.arguments && shortcut.argumentCount != Object.keys(shortcut.arguments).length) {
      return `Mismatch in argumentCount of key and arguments.length of url in "${shortcut.namespace}.${shortcut.key}".`;
    }
  }
  static checkIfArgCountMatchesWithExamples(shortcut) {
    if (!shortcut.examples) {
      return;
    }
    for (const example of shortcut.examples) {
      if (!example.arguments) {
        continue;
      }
      const exampleArgs = example.arguments.toString().split(",");
      if (shortcut.argumentCount != exampleArgs.length) {
        return `Mismatch in argumentCount of key and arguments.length of example in "${shortcut.namespace}.${shortcut.key}".`;
      }
    }
  }
}
