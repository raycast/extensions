import { Action, ActionPanel, Detail } from "@raycast/api";
import React from "react";

interface LocalAddressProps {
  targetAddress: string;
  onAction?: () => void;
}

export const LocalAddress = ({ targetAddress, onAction }: LocalAddressProps) => {
  return (
    <Detail
      markdown={getEmptyErrorMarkdown(targetAddress)}
      actions={
        <ActionPanel>
          <Action title="Look up Anyway" onAction={onAction} />
        </ActionPanel>
      }
    />
  );
};

const getEmptyErrorMarkdown = (targetAddress: string) => `
# Local MAC address 🏠
> __${targetAddress}__

The address that you are trying to look up is most likely local address,  
since the second hex of the address is one of the following: _2, 6, A, E, a, e_ 

See RFC 9542 Section 2.1 for more information.
`;
