import { ShortcutMerger as CoreMerger } from "../shortcut-core/merger";
import { parseKey } from "../shortcut-core/parser";
import { modifierMapping, Modifiers } from "../model/internal/modifiers";
import type { UserCustomizations } from "./models";
export class ShortcutMerger extends CoreMerger<Modifiers, string> {
  constructor(customizations: UserCustomizations) {
    super(customizations, (key) =>
      parseKey(key).map(({ base, modifiers }) => ({
        base,
        modifiers: modifiers.map((token) => modifierMapping.get(token)!),
      }))
    );
  }
}
