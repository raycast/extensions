/**
 * CVC2 detail view component for viewing and generating card CVCs.
 */

import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useCallback } from "react";
import { withSessionRefresh, type useBunqSession } from "../../hooks/useBunqSession";
import { getCardCvc2, generateCardCvc2, type Card } from "../../api/endpoints";
import { getCardName } from "./card-helpers";
import { formatDate } from "../../lib/formatters";
import { getErrorMessage } from "../../lib/errors";
import { copyToClipboard } from "../../lib/actions";
import { requireUserId } from "../../lib/session-guard";

interface Cvc2DetailViewProps {
  card: Card;
  session: ReturnType<typeof useBunqSession>;
}

export function Cvc2DetailView({ card, session }: Cvc2DetailViewProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    data: cvc2List,
    isLoading,
    revalidate,
  } = usePromise(
    async () => {
      if (!session.userId || !session.sessionToken) return [];
      const userId = requireUserId(session);
      return withSessionRefresh(session, () => getCardCvc2(userId, card.id, session.getRequestOptions()));
    },
    [],
    { execute: session.isConfigured && !session.isLoading },
  );

  const handleGenerateCvc2 = useCallback(async () => {
    setIsGenerating(true);
    try {
      await showToast({ style: Toast.Style.Animated, title: "Generating CVC2..." });
      const userId = requireUserId(session);
      const cvc2 = await withSessionRefresh(session, () =>
        generateCardCvc2(userId, card.id, session.getRequestOptions()),
      );
      await showToast({ style: Toast.Style.Success, title: "CVC2 Generated", message: `Code: ${cvc2.cvc2}` });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to generate CVC2",
        message: getErrorMessage(error),
      });
    } finally {
      setIsGenerating(false);
    }
  }, [session, card.id, revalidate]);

  const activeCvc2 = cvc2List?.find((c) => c.status === "AVAILABLE");
  const lastFour = card.primary_account_number_four_digit || "****";

  const markdown = activeCvc2
    ? `# Card CVC2

**Card:** •••• •••• •••• ${lastFour}

---

## Active CVC2

\`\`\`
${activeCvc2.cvc2}
\`\`\`

**Expires:** ${activeCvc2.expiry_time ? formatDate(activeCvc2.expiry_time) : "Unknown"}

---

*CVC2 codes expire after a short time for security. Generate a new one when needed.*
`
    : `# Card CVC2

**Card:** •••• •••• •••• ${lastFour}

---

No active CVC2 code. Generate one to use for online purchases.

---

*CVC2 codes expire after a short time for security.*
`;

  return (
    <Detail
      isLoading={isLoading || isGenerating}
      navigationTitle={`CVC2 - ${getCardName(card)}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Generate New CVC2"
            icon={Icon.Key}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={handleGenerateCvc2}
          />
          {activeCvc2 && (
            <Action
              title="Copy CVC2"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={() => copyToClipboard(activeCvc2.cvc2, "CVC2")}
            />
          )}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
        </ActionPanel>
      }
      metadata={
        activeCvc2 ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="CVC2" text={activeCvc2.cvc2} />
            <Detail.Metadata.Label title="Status" text={activeCvc2.status ?? ""} />
            {activeCvc2.expiry_time && (
              <Detail.Metadata.Label title="Expires" text={formatDate(activeCvc2.expiry_time)} />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Card" text={getCardName(card)} />
            <Detail.Metadata.Label title="Last 4" text={lastFour} />
          </Detail.Metadata>
        ) : undefined
      }
    />
  );
}
