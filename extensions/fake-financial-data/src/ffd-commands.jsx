import { MenuBarExtra, Icon } from "@raycast/api";
import { generateFakeAccountNumber, generateFakeBIC, copyToClipboard } from "../utils";
import { IBAN } from "ibankit";

export default function Command() {
  return (
    <MenuBarExtra icon={Icon.AddPerson} tooltip="Generate Financial Data">
      <MenuBarExtra.Item title="IBAN" />
      <MenuBarExtra.Item
        title="Generate an IBAN"
        onAction={() => {
          copyToClipboard(IBAN.random().value);
        }}
      />
      <MenuBarExtra.Item title="SWIFT/BIC" />
      <MenuBarExtra.Item
        title="Generate SWIFT"
        onAction={() => {
          copyToClipboard(generateFakeBIC());
        }}
      />
      <MenuBarExtra.Item title="Account Number" />
      <MenuBarExtra.Item
        title="Generate an Account Number"
        onAction={() => {
          copyToClipboard(generateFakeAccountNumber());
        }}
      />
    </MenuBarExtra>
  );
}
