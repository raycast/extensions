import { Action, Icon } from "@raycast/api";
import { Enhet } from "../types";
import React from "react";

/**
 * Props for the EntityActions component
 */
interface EntityActionsProps {
  /** The entity to display actions for */
  entity: Enhet;
  /** Optional formatted address string */
  addressString?: string;
  /** Callback when view details is clicked */
  onViewDetails: (entity: Enhet) => void;
  /** Callback when organization number is copied */
  onCopyOrgNumber: (orgNumber: string) => void;
  /** Callback when address is copied */
  onCopyAddress: (address: string) => void;
  /** Callback when open in browser is clicked */
  onOpenInBrowser: (url: string) => void;
}

/**
 * EntityActions component provides common actions for any entity
 * including view details, copy to clipboard, and open in browser
 */
function EntityActions({
  entity,
  addressString,
  onViewDetails,
  onCopyOrgNumber,
  onCopyAddress,
  onOpenInBrowser,
}: EntityActionsProps) {
  const bregUrl = `https://virksomhet.brreg.no/oppslag/enheter/${entity.organisasjonsnummer}`;

  return (
    <>
      <Action title="View Details" icon={Icon.AppWindowSidebarLeft} onAction={() => onViewDetails(entity)} />
      <Action.CopyToClipboard
        content={entity.organisasjonsnummer}
        title="Copy Org. Nr."
        shortcut={{ modifiers: ["cmd"], key: "o" }}
        onCopy={() => onCopyOrgNumber(entity.organisasjonsnummer)}
      />
      {addressString && (
        <Action.CopyToClipboard
          content={addressString}
          title="Copy Business Address"
          onCopy={() => onCopyAddress(addressString)}
        />
      )}
      <Action.OpenInBrowser
        shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
        title="Open in Brønnøysundregistrene"
        url={bregUrl}
        onOpen={() => onOpenInBrowser(bregUrl)}
      />
    </>
  );
}

// Memoize component for better performance
export default React.memo(EntityActions);
