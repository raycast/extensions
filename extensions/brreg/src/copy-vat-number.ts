import { showToast, Toast } from "@raycast/api";
import { getCompanyDetails } from "./brreg-api";
import { copyVatNumberToClipboard } from "./utils/entity";
import { API_CONFIG } from "./constants";

interface Arguments {
  organizationNumber: string;
}

export default async function Command({ arguments: { organizationNumber } }: { arguments: Arguments }) {
  const normalized = organizationNumber.trim().replace(/\s+/g, "");

  if (normalized.length !== API_CONFIG.MIN_ORG_NUMBER_LENGTH || !/^\d+$/.test(normalized)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid Organization Number",
      message: `Organization number must be ${API_CONFIG.MIN_ORG_NUMBER_LENGTH} digits`,
    });
    return;
  }

  try {
    const company = await getCompanyDetails(normalized);

    if (!company) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Company Not Found",
        message: `No company found with organization number ${normalized}`,
      });
      return;
    }

    await copyVatNumberToClipboard(
      normalized,
      company.name,
      company.isVatRegistered,
      (vatNumber) => `${vatNumber} copied to clipboard`,
      (name) => `Company ${name} is not registered for VAT`,
    );
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : "Failed to copy VAT number",
    });
  }
}
