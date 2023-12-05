import { InputApp, InputShortcut } from "../model/input/input-models";
import { modifierMapping } from "../model/internal/modifiers";

export default class Validator {
  constructor(private readonly keyCodes: Map<string, string>) {}

  public validate(inputApps: InputApp[]): void {
    inputApps.forEach((inputApp) => {
      inputApp.keymaps.forEach((inputKeymap) => {
        inputKeymap.sections.forEach((inputSection) => {
          inputSection.shortcuts.forEach((inputShortcut) => this.validateShortcut(inputShortcut));
        });
      });
    });
  }

  private validateShortcut(inputShortcut: InputShortcut): void {
    const shortcutKey = inputShortcut.key;
    if (shortcutKey === undefined) return;
    shortcutKey.split(" ").forEach((chord) => this.validateChord(shortcutKey, chord));
  }

  private validateChord(fullShortcutKey: string, chord: string): void {
    const chordTokens = chord.split("+");
    const totalNumberOfTokens = chordTokens.length;
    this.validateModifiersExist(totalNumberOfTokens, chordTokens, fullShortcutKey);
    this.validateBaseShortcutToken(chordTokens[totalNumberOfTokens - 1], fullShortcutKey);
  }

  private validateModifiersExist(totalNumberOfTokens: number, chordTokens: string[], fullShortcutKey: string) {
    for (let i = 0; i < totalNumberOfTokens - 1; i++) {
      const token = chordTokens[i];
      if (token === "") {
        throw new ValidationError(`Invalid shortcut: '${fullShortcutKey}'`);
      }
      const modifier = modifierMapping.get(token);
      if (modifier === undefined) {
        throw new ValidationError(`Modifier doesn't exist: '${fullShortcutKey}'`);
      }
    }
  }

  private validateBaseShortcutToken(baseToken: string, fullShortcutKey: string) {
    if (this.keyCodes.has(baseToken)) return;
    if (modifierMapping.has(baseToken)) {
      throw new ValidationError(`Shortcut expression should end with base key: '${fullShortcutKey}'`);
    }
    throw new ValidationError(`Unknown base key for shortcut: '${fullShortcutKey}'`);
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, new.target.prototype); // Ensure proper inheritance
  }
}
