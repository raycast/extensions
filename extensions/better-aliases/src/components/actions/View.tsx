import { Action, Detail, Icon } from "@raycast/api";
import { KEYBOARD_SHORTCUTS } from "../../lib/constants";
import type { BetterAliasItem } from "../../schemas";

interface ViewDetailProps {
  alias: string;
  item: BetterAliasItem;
  itemType: "alias" | "snippet";
}

function ViewDetail({ alias, item, itemType }: ViewDetailProps) {
  const markdown = `
# ${itemType === "alias" ? "Alias" : "Snippet"} Details

**Alias:** \`${alias}\`

**Label:** ${item.label || "N/A"}

**Value:**
\`\`\`
${item.value}
\`\`\`

**Type:** ${item.snippetOnly ? "Snippet Only" : "Standard Alias"}
  `.trim();

  return <Detail markdown={markdown} />;
}

interface ViewActionProps {
  alias: string;
  item: BetterAliasItem;
  itemType: "alias" | "snippet";
}

export function ViewAction({ alias, item, itemType }: ViewActionProps) {
  return (
    <Action.Push
      title="View Details"
      icon={Icon.Eye}
      shortcut={KEYBOARD_SHORTCUTS.VIEW}
      target={<ViewDetail alias={alias} item={item} itemType={itemType} />}
    />
  );
}
