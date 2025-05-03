import { SHORTCUT_KEY_SEQUENCE } from "~/constants/general";
import { IDENTITY_KEY_LABEL } from "~/constants/labels";
import { Identity } from "~/types/vault";

export function getIdentityDetailsMarkdown(itemName: string, identity: Identity) {
  return `# 🪪 ${itemName}
&nbsp;
| ⌘\t**Field** | **Value** |
| --- | --- |
${Object.entries(identity)
  .map(([key, value], index) => {
    if (!value) return null;
    const label = IDENTITY_KEY_LABEL[key as keyof Identity];
    const shortcutKey = SHORTCUT_KEY_SEQUENCE[index];

    return `| ${shortcutKey ? `${shortcutKey}.` : "&nbsp;"}\t**${label}** | ${value} |`;
  })
  .filter(Boolean)
  .join("\n")}
`;
}

export function getIdentityDetailsCopyValue(identity: Identity): string {
  return Object.entries(identity)
    .map(([key, value]) => (value ? `${IDENTITY_KEY_LABEL[key as keyof Identity]}: ${value}` : null))
    .filter(Boolean)
    .join("\n");
}

const IDENTITY_KEY_LABEL_KEYS = Object.keys(IDENTITY_KEY_LABEL);
/** sorts the fields according to the order they appear on bitwarden's web vault form */
export function identityFormOrderSorter([a]: string | [string, any], [b]: string | [string, any]) {
  const aIndex = IDENTITY_KEY_LABEL_KEYS.indexOf((Array.isArray(a) ? a[0] : a) as keyof Identity);
  const bIndex = IDENTITY_KEY_LABEL_KEYS.indexOf((Array.isArray(b) ? b[0] : b) as keyof Identity);
  return aIndex - bIndex;
}
