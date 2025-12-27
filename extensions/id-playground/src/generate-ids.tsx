import { ActionPanel, Action, List, Icon, showToast, Toast, Clipboard } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import {
  generateIMEI,
  generateICCID,
  generateMSISDN,
  generateUUID,
  generateMACAddress,
  generateIPAddress,
  generateIBAN,
} from "./utils/generators";

import { Identifier, IDENTIFIER_CONFIG, IdentifierType } from "./utils/types";

export default function Command() {
  const [identifiers, setIdentifiers] = useState<Identifier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const generateAll = useCallback(() => {
    setIsLoading(true);
    const newIdentifiers: Identifier[] = [
      { type: "imei", label: IDENTIFIER_CONFIG.imei.label, value: generateIMEI() },
      { type: "iccid", label: IDENTIFIER_CONFIG.iccid.label, value: generateICCID() },
      { type: "msisdn", label: IDENTIFIER_CONFIG.msisdn.label, value: generateMSISDN() },
      { type: "uuid", label: IDENTIFIER_CONFIG.uuid.label, value: generateUUID() },
      { type: "mac", label: IDENTIFIER_CONFIG.mac.label, value: generateMACAddress() },
      { type: "ip", label: IDENTIFIER_CONFIG.ip.label, value: generateIPAddress() },
      { type: "iban", label: IDENTIFIER_CONFIG.iban.label, value: generateIBAN() },
    ];
    setIdentifiers(newIdentifiers);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    generateAll();
  }, [generateAll]);

  const copyToClipboard = async (value: string, label: string) => {
    await Clipboard.copy(value);
    await showToast({
      style: Toast.Style.Success,
      title: `Copied ${label}`,
      message: value,
    });
  };

  const regenerate = (type: IdentifierType) => {
    let newValue: string;
    switch (type) {
      case "imei":
        newValue = generateIMEI();
        break;
      case "iccid":
        newValue = generateICCID();
        break;
      case "msisdn":
        newValue = generateMSISDN();
        break;
      case "uuid":
        newValue = generateUUID();
        break;
      case "mac":
        newValue = generateMACAddress();
        break;
      case "ip":
        newValue = generateIPAddress();
        break;
      case "iban":
        newValue = generateIBAN();
        break;
    }

    setIdentifiers((prev) => prev.map((id) => (id.type === type ? { ...id, value: newValue } : id)));
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search identifiers..."
      actions={
        <ActionPanel>
          <Action title="Regenerate All" icon={Icon.ArrowClockwise} onAction={generateAll} />
        </ActionPanel>
      }
    >
      {identifiers.map((identifier) => {
        const config = IDENTIFIER_CONFIG[identifier.type];
        return (
          <List.Item
            key={identifier.type}
            icon={config.icon}
            title={identifier.label}
            subtitle={identifier.value}
            actions={
              <ActionPanel>
                <Action
                  title="Copy to Clipboard"
                  icon={Icon.Clipboard}
                  onAction={() => copyToClipboard(identifier.value, identifier.label)}
                />
                <Action title="Regenerate" icon={Icon.ArrowClockwise} onAction={() => regenerate(identifier.type)} />
                <Action title="Regenerate All" icon={Icon.ArrowClockwise} onAction={generateAll} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
