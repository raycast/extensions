import { parseKey } from "../shortcut-core/parser";
import { Application, SectionShortcut } from "../model/internal/internal-models";
import { modifierMapping } from "../model/internal/modifiers";
import { InputApp, InputKeymap, InputSection, InputShortcut } from "../model/input/input-models";

export class ShortcutsParser {
  constructor(private readonly keyCodes: Record<string, string>) {}

  public parseInputShortcuts(inputApps: InputApp[]): Application[] {
    return inputApps
      .filter((inputApp) => this.inputAppIsValid(inputApp))
      .map((inputApp) => {
        return {
          name: inputApp.name,
          bundleId: inputApp.bundleId,
          windowsAppId: inputApp.windowsAppId,
          windowsProcessName: inputApp.windowsProcessName,
          hostname: inputApp.hostname,
          slug: inputApp.slug,
          keymaps: inputApp.keymaps.map((inputKeymap) => {
            return {
              title: inputKeymap.title,
              platforms: inputKeymap.platforms,
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

  private shortcutKeyIsValid(key: string | undefined): boolean {
    try {
      parseKey(key, (base) => Object.prototype.hasOwnProperty.call(this.keyCodes, base));
      return true;
    } catch {
      return false;
    }
  }

  private parseSingleShortcut(inputShortcut: InputShortcut): SectionShortcut {
    return {
      title: inputShortcut.title,
      comment: inputShortcut.comment,
      sequence: parseKey(inputShortcut.key).map(({ base, modifiers }) => ({
        base,
        modifiers: modifiers.map((token) => modifierMapping.get(token)!),
      })),
    };
  }
}
