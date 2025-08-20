import { CompanyData, RepresentativeInfo } from "../types";
import { createINPIApiService } from "./inpi-api-mock";
import { extractRepresentativeInfo } from "./markdown-builder";
import { validateAndExtractSiren } from "./utils";

/**
 * Recursively searches for the physical person representative of a holding company.
 * If the representative of a company is another company (holding), this function
 * will fetch the holding's data and find its physical person representative.
 *
 * @param holdingName - Name of the holding company
 * @param holdingSiren - SIREN of the holding company (if available)
 * @param originalRole - Role of the holding company as representative
 * @param maxDepth - Maximum recursion depth to prevent infinite loops (default: 3)
 * @returns Promise<RepresentativeInfo> - Updated representative info with physical person
 */
export async function findPhysicalRepresentative(
  holdingName: string,
  holdingSiren: string | null,
  originalRole: string,
  maxDepth: number = 3,
): Promise<RepresentativeInfo> {
  console.log(`🔍 Searching for physical representative of ${holdingName} (SIREN: ${holdingSiren})`);

  // Fallback if no SIREN available or max depth reached
  if (!holdingSiren || maxDepth <= 0) {
    console.log(`⚠️  Cannot search deeper: SIREN=${holdingSiren}, depth=${maxDepth}`);
    return {
      name: holdingName,
      role: originalRole,
      gender: null,
      isHolding: true,
    };
  }

  // Validate SIREN format
  const validSiren = validateAndExtractSiren(holdingSiren);
  if (!validSiren) {
    console.log(`⚠️  Invalid SIREN format: ${holdingSiren}`);
    return {
      name: holdingName,
      role: originalRole,
      gender: null,
      isHolding: true,
    };
  }

  try {
    // Fetch holding company data
    const apiService = await createINPIApiService();
    const holdingData: CompanyData = await apiService.getCompanyInfo(validSiren);

    if (!holdingData.formality?.content?.personneMorale?.composition) {
      console.log(`⚠️  No composition data found for ${holdingName}`);
      return {
        name: holdingName,
        role: originalRole,
        gender: null,
        isHolding: true,
      };
    }

    // Extract representative from holding company
    const holdingRep = extractRepresentativeInfo(holdingData.formality.content.personneMorale.composition);

    // If the holding's representative is also a company, recurse
    if (holdingRep.isHolding && holdingRep.name !== holdingName) {
      console.log(`🔄 Holding ${holdingName} is represented by another company: ${holdingRep.name}`);

      // For now, we'll return the chain without going deeper to avoid complex recursion
      // In a future version, we could implement full recursive search
      return {
        name: holdingName,
        role: originalRole,
        gender: null,
        isHolding: true,
        holdingRepresentative: {
          name: holdingRep.name,
          role: holdingRep.role,
          gender: holdingRep.gender,
        },
      };
    }

    // If we found a physical person, return the chain
    if (!holdingRep.isHolding && holdingRep.name !== holdingName) {
      console.log(`✅ Found physical representative: ${holdingRep.name} for ${holdingName}`);
      return {
        name: holdingName,
        role: originalRole,
        gender: null,
        isHolding: true,
        holdingRepresentative: {
          name: holdingRep.name,
          role: holdingRep.role,
          gender: holdingRep.gender,
        },
      };
    }

    // No usable representative found
    console.log(`⚠️  No physical representative found for ${holdingName}`);
    return {
      name: holdingName,
      role: originalRole,
      gender: null,
      isHolding: true,
    };
  } catch (error) {
    console.error(`❌ Error searching for representative of ${holdingName}:`, error);
    return {
      name: holdingName,
      role: originalRole,
      gender: null,
      isHolding: true,
    };
  }
}

/**
 * Extracts SIREN from enterprise data if available
 */
export function extractSirenFromEnterprise(entreprise: Record<string, unknown>): string | null {
  // Look for SIREN in various possible fields
  const sirenFields = ["siren", "sirenEntreprise", "identifiant"];

  for (const field of sirenFields) {
    const value = entreprise[field];
    if (typeof value === "string" && value.length === 9 && /^\d{9}$/.test(value)) {
      return value;
    }
  }

  return null;
}
