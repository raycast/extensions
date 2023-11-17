import { Application, AtomicShortcut, SectionShortcut } from "../model/internal/internal-models";
import { modifierMapping, Modifiers } from "../model/internal/modifiers";
import { InputApp, InputShortcut } from "../model/input/input-models";

export class ShortcutsParser {
  public parseInputShortcuts(inputApps: InputApp[]): Application[] {
    return inputApps.map((inputApp) => {
      return {
        name: inputApp.name,
        bundleId: inputApp.bundleId,
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
    const chordTokens = chord.split("+");
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
