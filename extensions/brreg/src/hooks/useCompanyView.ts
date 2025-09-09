import { useState } from "react";
import { Company, Enhet } from "../types";
import { getCompanyDetails } from "../brreg-api";
import { showFailureToast } from "../utils/toast";

export function useCompanyView() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [detailedCompany, setDetailedCompany] = useState<Company | null>(null);

  const handleViewDetails = async (entity: Enhet) => {
    const base: Company = {
      name: entity.navn,
      organizationNumber: entity.organisasjonsnummer,
      address: entity.forretningsadresse?.adresse?.join(", ") || undefined,
      postalCode: entity.forretningsadresse?.postnummer || undefined,
      city: entity.forretningsadresse?.poststed || undefined,
      bregUrl: `https://virksomhet.brreg.no/oppslag/enheter/${entity.organisasjonsnummer}`,
    };

    setSelectedCompany(base);
    setDetailedCompany(null);

    try {
      const details = await getCompanyDetails(entity.organisasjonsnummer);
      setDetailedCompany(details ?? base);
    } catch (e) {
      setDetailedCompany(base);
      showFailureToast("Failed to load details");
    }
  };

  const closeCompanyView = () => {
    setSelectedCompany(null);
    setDetailedCompany(null);
  };

  const isCompanyViewOpen = selectedCompany !== null;
  const currentCompany = detailedCompany || selectedCompany;
  const isLoadingDetails = selectedCompany !== null && detailedCompany === null;

  return {
    // State
    selectedCompany,
    detailedCompany,
    currentCompany,
    isLoadingDetails,
    isCompanyViewOpen,

    // Actions
    handleViewDetails,
    closeCompanyView,
  };
}
