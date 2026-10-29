import { ShortcutMerger as CoreMerger } from "../shortcut-core/merger";
import { parseKey } from "../shortcut-core/parser";
import { modifierMapping, Modifiers } from "../model/internal/modifiers";
import type { UserCustomizations } from "./models";
import { supportsPlatform } from "../shortcut-core/platforms";
import { getPlatform } from "../load/platform";
export class ShortcutMerger extends CoreMerger<Modifiers, string> {
  constructor(customizations: UserCustomizations) {
    // Public catalog keymaps are already filtered by platform; filter saved
    // additions before title-based merging can erase their platform scope.
    super(
      {
        ...customizations,
        customKeymaps: customizations.customKeymaps?.filter((keymap) =>
          supportsPlatform(keymap.platforms, getPlatform())
        ),
      },
      (key) =>
        parseKey(key).map(({ base, modifiers }) => ({
          base,
          modifiers: modifiers.map((token) => modifierMapping.get(token)!),
        }))
    );
  }
}
