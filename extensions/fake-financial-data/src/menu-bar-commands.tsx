import React from "react";
import { MenuBarExtra } from "@raycast/api";

import {
  copyIbanToClipboard,
  copySwiftToClipboard,
  copyAccountNumberToClipboard,
  copySortCodeToClipboard,
} from "../utils";

export default function Command() {
  return (
    <MenuBarExtra
      icon={{ source: "icon.png" }}
      tooltip="Generate Financial Data"
    >
      <MenuBarExtra.Item title="IBAN" />
      <MenuBarExtra.Item title="Generate IBAN" onAction={copyIbanToClipboard} />
      <MenuBarExtra.Item title="SWIFT/BIC" />
      <MenuBarExtra.Item
        title="Generate SWIFT/BIC"
        onAction={copySwiftToClipboard}
      />
      <MenuBarExtra.Item title="Account Number" />
      <MenuBarExtra.Item
        title="Generate Account Number"
        onAction={copyAccountNumberToClipboard}
      />
      <MenuBarExtra.Item title="Sort Code" />
      <MenuBarExtra.Item
        title="Generate Sort Code"
        onAction={copySortCodeToClipboard}
      />
    </MenuBarExtra>
  );
}
