import { useMemo } from "react";
import { Action, ActionPanel, getPreferenceValues } from "@raycast/api";
import { SearchItem } from "@/types";
import {
  copyFAClassesToClipboard,
  copyFAGlyphToClipboard,
  copyFASlugToClipboard,
  copyFAUnicodeClipboard,
  copySvgToClipboard,
} from "@/utils/actions";

type IconActionsProps = {
  searchItem: SearchItem;
};

export const IconActions = ({ searchItem }: IconActionsProps) => {
  const { PRIMARY_ACTION } = getPreferenceValues();

  const actions = useMemo(() => {
    const actions = [
      {
        action: (
          <Action
            key="copyIconName"
            title={`Copy Icon Name`}
            icon="copy-clipboard-16"
            onAction={() => copyFASlugToClipboard(searchItem)}
          />
        ),
        id: "copyIconName",
      },
      {
        action: (
          <Action
            key="copyIconClasses"
            title={`Copy Icon Classes`}
            icon="copy-clipboard-16"
            onAction={() => copyFAClassesToClipboard(searchItem)}
          />
        ),
        id: "copyIconClasses",
      },
      {
        action: (
          <Action
            key="copyAsSvg"
            title={`Copy as SVG`}
            icon="copy-clipboard-16"
            onAction={() => copySvgToClipboard(searchItem)}
          />
        ),
        id: "copyAsSvg",
      },
      {
        action: (
          <Action
            key="copyIconGlyph"
            title={`Copy Icon Glyph`}
            icon="copy-clipboard-16"
            onAction={() => copyFAGlyphToClipboard(searchItem)}
          />
        ),
        id: "copyIconGlyph",
      },
      {
        action: (
          <Action
            key="copyIconUnicode"
            title={`Copy Icon Unicode`}
            icon="copy-clipboard-16"
            onAction={() => copyFAUnicodeClipboard(searchItem)}
          />
        ),
        id: "copyIconUnicode",
      },
    ];

    const primaryActionIndex = actions.findIndex((a) => a.id === PRIMARY_ACTION);
    if (primaryActionIndex > -1) {
      const [primaryAction] = actions.splice(primaryActionIndex, 1);
      actions.unshift(primaryAction);
    }

    return actions;
  }, [searchItem, PRIMARY_ACTION]);

  return <ActionPanel>{actions.map((a) => a.action)}</ActionPanel>;
};
