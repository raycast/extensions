import { Action, Icon } from "@raycast/api";
import KeyboardShortcutsHelp from "./KeyboardShortcutsHelp";
import { Enhet } from "../types";
import { KEYBOARD_SHORTCUTS } from "../constants";
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
        title="Copy Organization Number"
        shortcut={KEYBOARD_SHORTCUTS.COPY_ORG_NUMBER}
        onCopy={() => onCopyOrgNumber(entity.organisasjonsnummer)}
      />
      {addressString && (
        <Action.CopyToClipboard
          content={addressString}
          title="Copy Business Address"
          shortcut={KEYBOARD_SHORTCUTS.COPY_ADDRESS}
          onCopy={() => onCopyAddress(addressString)}
        />
      )}
      <Action.OpenInBrowser
        shortcut={KEYBOARD_SHORTCUTS.OPEN_IN_BROWSER}
        title="Open in Brønnøysundregistrene"
        url={bregUrl}
        onOpen={() => onOpenInBrowser(bregUrl)}
      />
      <Action.Push title="Keyboard Shortcuts" target={<KeyboardShortcutsHelp />} />
    </>
  );
}

// Memoize component for better performance
export default React.memo(EntityActions);
