import { Action, Icon } from "@raycast/api";
import KeyboardShortcutsHelp from "./KeyboardShortcutsHelp";
import ChangelogView from "./ChangelogView";
import { Enhet } from "../types";
import { KEYBOARD_SHORTCUTS } from "../constants";
import React from "react";
import { copyVatNumberToClipboard, getAlleAsUrl, getBregUrl, getVatRegistrationStatus } from "../utils/entity";

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
}

/**
 * EntityActions component provides common actions for any entity
 * including view details, copy to clipboard, and open in browser
 */
function EntityActions({ entity, addressString, onViewDetails }: EntityActionsProps) {
  const bregUrl = getBregUrl(entity.organisasjonsnummer);
  const alleAsUrl = getAlleAsUrl(entity.organisasjonsnummer);

  const copyVatNumber = () =>
    copyVatNumberToClipboard(entity.organisasjonsnummer, entity.navn, getVatRegistrationStatus(entity));

  return (
    <>
      <Action title="View Details" icon={Icon.AppWindowSidebarLeft} onAction={() => onViewDetails(entity)} />
      <Action.CopyToClipboard
        content={entity.organisasjonsnummer}
        title="Copy Organization Number"
        shortcut={KEYBOARD_SHORTCUTS.COPY_ORG_NUMBER}
      />
      <Action
        title="Copy Vat Number"
        icon={Icon.Clipboard}
        onAction={copyVatNumber}
        shortcut={KEYBOARD_SHORTCUTS.COPY_VAT_NUMBER}
      />
      {addressString && (
        <Action.CopyToClipboard
          content={addressString}
          title="Copy Business Address"
          shortcut={KEYBOARD_SHORTCUTS.COPY_ADDRESS}
        />
      )}
      <Action.OpenInBrowser shortcut={KEYBOARD_SHORTCUTS.OPEN_IN_BROWSER} title="Open in Brreg" url={bregUrl} />
      <Action.OpenInBrowser title="Open in Alle.as" url={alleAsUrl} />
      <Action.Push title="Changelog" target={<ChangelogView />} />
      <Action.Push title="Keyboard Shortcuts" target={<KeyboardShortcutsHelp />} />
    </>
  );
}

// Memoize component for better performance
export default React.memo(EntityActions);
