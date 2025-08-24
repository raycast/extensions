import { Action, ActionPanel, Detail, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { generateOrganizationNumber } from "./orgno-generator/orgno-generator";

export default function Command() {
  const [orgNumber, setOrgNumber] = useState<string>("");

  const generate = () => {
    const newOrgNo = generateOrganizationNumber({ withSeparator: true });
    setOrgNumber(newOrgNo);
  };

  useEffect(() => {
    generate();
  }, []);

  const body = `# Fake OrgNo Generator\n\n\`${orgNumber}\`\n\n*⌘ + ↲ to regenerate*`;

  return (
    <Detail
      markdown={body}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="💾 Copy"
            content={orgNumber}
            onCopy={async () => {
              await showHUD("✅ Copied organization number!", {
                clearRootSearch: true,
              });
            }}
          />
          <Action title="⟲" onAction={generate} />
        </ActionPanel>
      }
    />
  );
}
