import { Action, ActionPanel, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { LinkCandidate, EmailSender, ValidatedLink } from "../lib/types";
import { rememberPattern } from "../lib/learning";
import { useMemo } from "react";

interface LinkChooserProps {
  candidates: LinkCandidate[];
  sender: EmailSender;
  senderRegistrableDomain: string | null;
  onSelect?: (link: ValidatedLink) => void;
}

export function LinkChooser({ candidates, sender, senderRegistrableDomain }: LinkChooserProps) {
  const items = useMemo(() => {
    return candidates.map((candidate, idx) => {
      const rationale = [
        candidate.isSameRegistrableDomain ? "Same sender domain" : null,
        candidate.hasPositiveIntent ? "Verification CTA" : null,
        candidate.score >= 130 ? "High confidence" : null,
      ]
        .filter(Boolean)
        .join(" · ");

      return { candidate, rationale, rank: idx + 1 };
    });
  }, [candidates]);

  return (
    <List navigationTitle="Choose Verification Link">
      {items.map(({ candidate, rationale }) => (
        <List.Item
          key={`${candidate.originalIndex}-${candidate.normalizedVisibleText}`}
          title={candidate.visibleText || "Verify"}
          subtitle={`${candidate.hostname}${candidate.pathSignature}`}
          accessories={[
            {
              tag: rationale,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={candidate.href} title="Open This Verification Link" />
              <Action.CopyToClipboard
                content={candidate.href}
                title="Copy This Verification Link"
                shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              />
              <Action
                title="Use and Remember This Link Pattern"
                icon={{ source: Icon.Star }}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                onAction={async () => {
                  if (!senderRegistrableDomain) return;
                  try {
                    const confirmed = await confirmAlert({
                      title: "Remember this link pattern?",
                      message: `Future emails from ${sender.email} may prefer HTTPS links with CTA "${candidate.normalizedVisibleText}" on ${candidate.hostname} and path ${candidate.pathSignature}. Links still need to match the sender’s registrable domain, pass anti-footer and redirect checks, and require explicit manual opening. No URLs, query strings, tokens, email content, or OTPs are stored.`,
                      primaryAction: { title: "Remember", onAction: () => true },
                    });
                    if (confirmed) {
                      await rememberPattern({
                        senderAddress: sender.email,
                        senderRegistrableDomain,
                        targetHostname: candidate.hostname,
                        normalizedCtaText: candidate.normalizedVisibleText,
                        pathSignature: candidate.pathSignature,
                      });
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Pattern remembered",
                      });
                    }
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Could not remember pattern",
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
