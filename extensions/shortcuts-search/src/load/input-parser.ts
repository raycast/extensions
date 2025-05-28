import { Application, AtomicShortcut, SectionShortcut } from "../model/internal/internal-models";
import { modifierMapping, Modifiers } from "../model/internal/modifiers";
import { InputApp, InputKeymap, InputSection, InputShortcut } from "../model/input/input-models";

export class ShortcutsParser {
  constructor(private readonly keyCodes: Map<string, string>) {}

  public parseInputShortcuts(inputApps: InputApp[]): Application[] {
    return inputApps
      .filter((inputApp) => this.inputAppIsValid(inputApp))
      .map((inputApp) => {
        return {
          name: inputApp.name,
          bundleId: inputApp.bundleId,
          hostname: inputApp.hostname,
          slug: inputApp.slug,
          keymaps: inputApp.keymaps.map((inputKeymap) => {
            return {
              title: inputKeymap.title,
              sections: inputKeymap.sections.map((inputSection) => {
                return {
                  title: inputSection.title,
                  hotkeys: inputSection.shortcuts.map((inputShortcut) => this.parseSingleShortcut(inputShortcut)),
                };
              }),
            };
          }),
        };
      });
  }

  private inputAppIsValid(inputApp: InputApp): boolean {
    return (
      inputApp.name !== undefined &&
      inputApp.name.length > 0 &&
      inputApp.slug !== undefined &&
      inputApp.slug.length > 0 &&
      inputApp.keymaps !== undefined &&
      inputApp.keymaps.length > 0 &&
      inputApp.keymaps.every((inputKeymap) => this.inputKeymapIsValid(inputKeymap))
    );
  }

  private inputKeymapIsValid(inputKeymap: InputKeymap): boolean {
    return (
      inputKeymap.title !== undefined &&
      inputKeymap.title.length > 0 &&
      inputKeymap.sections !== undefined &&
      inputKeymap.sections.length > 0 &&
      inputKeymap.sections.every((inputSection) => this.inputSectionIsValid(inputSection))
    );
  }

  private inputSectionIsValid(inputSection: InputSection): boolean {
    return (
      inputSection.title !== undefined &&
      inputSection.title.length > 0 &&
      inputSection.shortcuts !== undefined &&
      inputSection.shortcuts.length > 0 &&
      inputSection.shortcuts.every((inputShortcut) => this.inputShortcutIsValid(inputShortcut))
    );
  }

  private inputShortcutIsValid(inputShortcut: InputShortcut): boolean {
    return (
      inputShortcut.title !== undefined && inputShortcut.title.length > 0 && this.shortcutKeyIsValid(inputShortcut.key)
    );
  }

  private shortcutKeyIsValid(shortcutKey: string | undefined): boolean {
    if (shortcutKey === undefined) {
      return true;
    }

    const chords = shortcutKey.split(" ");

    return chords.length > 0 && chords.every((chord) => this.chordIsValid(chord));
  }

  private chordIsValid(chord: string): boolean {
    const chordTokens = chord.split(/(?<!\+)\+/);
    if (chordTokens.length === 0) {
      return false;
    }
    const totalNumberOfTokens = chordTokens.length;

    return (
      this.modifiersExist(totalNumberOfTokens, chordTokens) &&
      this.baseShortcutTokenIsValid(chordTokens[totalNumberOfTokens - 1])
    );
  }

  private modifiersExist(totalNumberOfTokens: number, chordTokens: string[]): boolean {
    for (let i = 0; i < totalNumberOfTokens - 1; i++) {
      if (!modifierMapping.has(chordTokens[i])) {
        return false;
      }
    }
    return true;
  }

  private baseShortcutTokenIsValid(baseToken: string): boolean {
    return this.keyCodes.has(baseToken);
  }

  private parseSingleShortcut(inputShortcut: InputShortcut): SectionShortcut {
    const chords = inputShortcut.key?.split(" ");
    const atomicSequence = chords?.map((chord) => this.parseChord(chord));
    return {
      title: inputShortcut.title,
      sequence: atomicSequence ?? [],
      comment: inputShortcut.comment,
    };
  }

  private parseChord(chord: string): AtomicShortcut {
    const chordTokens = chord.split(/(?<!\+)\+/);
    const totalNumberOfTokens = chordTokens.length;
    const modifiers: Modifiers[] = [];
    for (let i = 0; i < totalNumberOfTokens - 1; i++) {
      const token = chordTokens[i];
      const modifier = modifierMapping.get(token);
      if (modifier) {
        modifiers.push(modifier);
      }
    }
    const baseToken = chordTokens[totalNumberOfTokens - 1];
    return {
      base: baseToken,
      modifiers: modifiers,
    };
  }
}
