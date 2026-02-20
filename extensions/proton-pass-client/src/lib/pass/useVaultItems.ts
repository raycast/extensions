import { useEffect, useMemo } from "react";
import { useClient } from "./client";
import { Icon, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { originOf, useActiveTab } from "../raycast/useActiveTab";

export function useVaultItems(vaultName: string | null) {
  const client = useClient();
  const { activeOrigin } = useActiveTab();

  const {
    data: rawItems,
    isLoading,
    error,
  } = usePromise(async () => {
    return await client.getItems(vaultName);
  });

  const items = useMemo(() => {
    if (!rawItems) return rawItems;

    return rawItems
      .map((item) => {
        let icon = Icon.Lock;
        let isActiveOrigin = false;
        const clips: Clip[] = [];

        const pushIf = (key: string, value: string | undefined, confidential: boolean = false) => {
          if (value) clips.push({ title: toTitle(key), content: value, confidential });
        };

        switch (item.type) {
          case "Login":
            pushIf("email", item.email);
            pushIf("password", item.password, true);
            pushIf("username", item.username);
            isActiveOrigin = item.urls?.some((u) => originOf(u) === activeOrigin) ?? false;
            break;
          case "Identity":
            icon = Icon.Person;
            pushIf("full_name", item.full_name);
            pushIf("email", item.email);
            pushIf("phone_number", item.phone_number);
            pushIf("street_address", item.street_address);
            pushIf("zip_or_postal_code", item.zip_or_postal_code);
            pushIf("first_name", item.first_name);
            pushIf("middle_name", item.middle_name);
            pushIf("last_name", item.last_name);
            pushIf("birthdate", item.birthdate);
            pushIf("gender", item.gender);
            pushIf("organization", item.organization);
            break;
          case "CreditCard":
            icon = Icon.CreditCard;
            pushIf("number", item.number, true);
            pushIf("verification_number", item.verification_number, true);
            pushIf("expiration_date", item.expiration_date, true);
            pushIf("cardholder_name", item.cardholder_name);
            pushIf("card_type", item.card_type);
            break;
          case "SSHKey":
            icon = Icon.Key;
            pushIf("public_key", item.public_key);
            pushIf("private_key", item.private_key, true);
            break;
        }

        return {
          ...item,
          icon,
          isActiveOrigin,
          clipboardElements: clips,
        };
      })
      .sort((a, b) => {
        const aMatches =
          a.type === "Login" && Array.isArray(a.urls) && a.urls.some((u) => originOf(u) === activeOrigin);

        const bMatches =
          b.type === "Login" && Array.isArray(b.urls) && b.urls.some((u) => originOf(u) === activeOrigin);

        if (aMatches === bMatches) return 0;
        return aMatches ? -1 : 1;
      });
  }, [rawItems, activeOrigin]);

  useEffect(() => {
    if (error) showToast(Toast.Style.Failure, "Error", error.message || "Something went wrong");
  }, [error]);

  return { items, isLoading, error };
}

// -- Utilities

type Clip = { title: string; content: string; confidential?: boolean };

const toTitle = (key: string) => {
  // Special cases first
  switch (key) {
    case "verification_number":
      return "Verification Number";
    case "zip_or_postal_code":
      return "ZIP/Postal Code";
    case "cardholder_name":
      return "Cardholder Name";
    case "card_type":
      return "Card Type";
    case "public_key":
      return "Public Key";
    case "private_key":
      return "Private Key";
    case "full_name":
      return "Full Name";
    case "first_name":
      return "First Name";
    case "middle_name":
      return "Middle Name";
    case "last_name":
      return "Last Name";
    case "phone_number":
      return "Phone Number";
    case "street_address":
      return "Street Address";
    case "expiration_date":
      return "Expiration Date";
    default:
      // Generic: snake_case or camelCase to Title Case
      return key
        .replace(/_/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/^\w|\s\w/g, (m) => m.toUpperCase());
  }
};
