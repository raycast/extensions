import React from "react";
import { MenuBarExtra } from "@raycast/api";
import { IBAN } from "ibankit";
import {
  generateFakeAccountNumber,
  generateFakeSWIFT,
  copyToClipboard,
} from "../utils";

export default function Command() {
  return (
    <MenuBarExtra
      icon={{ source: "icon.png" }}
      tooltip="Generate Financial Data"
    >
      <MenuBarExtra.Item title="IBAN" />
      <MenuBarExtra.Item
        title="Generate IBAN"
        onAction={() => {
          const iban = IBAN.random();
          copyToClipboard(iban.toString());
        }}
      />
      <MenuBarExtra.Item title="SWIFT/BIC" />
      <MenuBarExtra.Item
        title="Generate SWIFT/BIC"
        onAction={() => {
          copyToClipboard(generateFakeSWIFT());
        }}
      />
      <MenuBarExtra.Item title="Account Number" />
      <MenuBarExtra.Item
        title="Generate Account Number"
        onAction={() => {
          copyToClipboard(generateFakeAccountNumber());
        }}
      />
    </MenuBarExtra>
  );
}
