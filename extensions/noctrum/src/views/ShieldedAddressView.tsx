import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { WalletData } from "../lib/wallet";
import { generateShieldedAddress } from "../lib/external-api";
import { ShieldedAddressResponse, errorMessage } from "../lib/types";

export function ShieldedAddressView({ wallet }: { wallet: WalletData }) {
  const [result, setResult] = useState<ShieldedAddressResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateShieldedAddress(wallet)
      .then(setResult)
      .catch((e) => showToast(Toast.Style.Failure, "Error", errorMessage(e)))
      .finally(() => setIsLoading(false));
  }, []);

  const addr = result?.shieldedAddress ?? result?.address ?? "";
  const md = isLoading
    ? "Generating shielded address..."
    : addr
      ? `# Shielded Address\n\n\`\`\`\n${addr}\n\`\`\`\n\nShare this address to receive private transfers.`
      : "Failed to generate shielded address.";

  return (
    <Detail
      isLoading={isLoading}
      markdown={md}
      actions={
        addr ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Shielded Address" content={addr} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
