import { List, ActionPanel, Action, Detail, showToast, Toast, LocalStorage, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { Company } from "./types";
import { searchCompanies, getCompanyDetails } from "./brreg-api";

const FAVORITES_KEY = "norwegian-companies-favorites";

export default function SearchCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [detailedCompany, setDetailedCompany] = useState<Company | null>(null);
  const [favorites, setFavorites] = useState<Company[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState<boolean>(true);

  // Load favorites on component mount
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const storedFavorites = await LocalStorage.getItem<string>(FAVORITES_KEY);
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
    } catch (error) {
      await showFailureToast(error, { title: "Failed to load favorites" });
    } finally {
      setIsLoadingFavorites(false);
    }
  };

  const addToFavorites = async (company: Company) => {
    const newFavorites = [...favorites, company];
    setFavorites(newFavorites);
    await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    await showToast({
      style: Toast.Style.Success,
      title: "Added to Favorites",
      message: `${company.name} has been added to your favorites.`,
    });
  };

  const removeFromFavorites = async (company: Company) => {
    const newFavorites = favorites.filter((fav) => fav.organizationNumber !== company.organizationNumber);
    setFavorites(newFavorites);
    await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    await showToast({
      style: Toast.Style.Success,
      title: "Removed from Favorites",
      message: `${company.name} has been removed from your favorites.`,
    });
  };

  const isFavorite = (company: Company) => {
    return favorites.some((fav) => fav.organizationNumber === company.organizationNumber);
  };

  useEffect(() => {
    const performSearch = async () => {
      if (searchText.trim().length === 0) {
        setCompanies([]);
        return;
      }

      if (searchText.trim().length < 2) {
        return;
      }

      setIsLoading(true);
      try {
        const results = await searchCompanies(searchText.trim());
        setCompanies(results.companies);
      } catch (error) {
        await showFailureToast(error, {
          title: "Search Failed",
          message: "Could not search for companies. Please try again.",
        });
        setCompanies([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchText]);

  const handleCompanySelection = async (company: Company) => {
    setSelectedCompany(company);
    setDetailedCompany(null);

    if (company.organizationNumber) {
      try {
        // Get detailed company information using organization number
        const details = await getCompanyDetails(company.organizationNumber);
        if (details) {
          setDetailedCompany(details);
        } else {
          setDetailedCompany(company);
        }
      } catch (error) {
        await showFailureToast(error, { title: "Failed to Load Details", message: "Could not load company details." });
        // Show basic data as fallback
        setDetailedCompany(company);
      }
    } else {
      setDetailedCompany(company);
    }
  };

  if (selectedCompany) {
    return (
      <CompanyDetailsView
        company={detailedCompany || selectedCompany}
        isLoading={!detailedCompany}
        onBack={() => {
          setSelectedCompany(null);
          setDetailedCompany(null);
        }}
        isFavorite={isFavorite(detailedCompany || selectedCompany)}
        onAddToFavorites={() => addToFavorites(detailedCompany || selectedCompany)}
        onRemoveFromFavorites={() => removeFromFavorites(detailedCompany || selectedCompany)}
      />
    );
  }

  const showFavorites = searchText.trim().length === 0;

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoading || isLoadingFavorites}
      searchBarPlaceholder="Search by company name or organization number..."
      throttle
    >
      {showFavorites && favorites.length === 0 && !isLoadingFavorites && (
        <List.EmptyView
          title="Start Exploring"
          description="Enter a company name or organization number to access detailed business information and financial data"
          icon={Icon.Document}
        />
      )}
      {!showFavorites && companies.length === 0 && searchText.trim().length > 0 && !isLoading && (
        <List.EmptyView title="No companies found" description="Try searching with a different term" />
      )}
      {showFavorites && favorites.length > 0 && (
        <List.Section title="Favorites">
          {favorites.map((company) => (
            <List.Item
              key={`fav-${company.organizationNumber || company.name}`}
              title={company.name}
              subtitle={company.industry}
              icon={Icon.Star}
              accessories={[
                { text: company.city },
                {
                  text: company.organizationNumber ? `Org: ${company.organizationNumber}` : undefined,
                },
              ].filter(Boolean)}
              actions={
                <ActionPanel>
                  <Action title="View Details" onAction={() => handleCompanySelection(company)} />
                  <Action.OpenInBrowser
                    title="Open in Brreg"
                    url={company.bregUrl || "https://www.brreg.no"}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                    onOpen={(url) => {
                      try {
                        new URL(url);
                        return true;
                      } catch {
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Invalid URL",
                          message: "Could not open company page.",
                        });
                        return false;
                      }
                    }}
                  />
                  {company.website && (
                    <Action.OpenInBrowser
                      title="Open Company Website"
                      url={company.website}
                      shortcut={{ modifiers: ["cmd"], key: "l" }}
                      onOpen={(url) => {
                        try {
                          new URL(url);
                        } catch {
                          showToast({
                            style: Toast.Style.Failure,
                            title: "Invalid Website URL",
                            message: "The company website URL is not valid.",
                          });
                          return false;
                        }
                      }}
                    />
                  )}
                  <Action
                    title="Remove from Favorites"
                    icon={Icon.StarDisabled}
                    onAction={() => removeFromFavorites(company)}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Organization Number"
                    content={company.organizationNumber}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Company Name"
                    content={company.name}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {!showFavorites &&
        companies.map((company) => (
          <List.Item
            key={company.organizationNumber || company.name}
            title={company.name}
            subtitle={company.industry}
            accessories={[
              { text: company.city },
              {
                text: company.organizationNumber ? `Org: ${company.organizationNumber}` : undefined,
              },
            ].filter(Boolean)}
            actions={
              <ActionPanel>
                <Action title="View Details" onAction={() => handleCompanySelection(company)} />
                <Action.OpenInBrowser
                  title="Open in Brreg"
                  url={company.bregUrl || "https://www.brreg.no"}
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                  onOpen={(url) => {
                    try {
                      new URL(url);
                      return true;
                    } catch {
                      showToast({
                        style: Toast.Style.Failure,
                        title: "Invalid URL",
                        message: "Could not open company page.",
                      });
                      return false;
                    }
                  }}
                />
                {company.website && (
                  <Action.OpenInBrowser
                    title="Open Company Website"
                    url={company.website}
                    shortcut={{ modifiers: ["cmd"], key: "l" }}
                    onOpen={(url) => {
                      try {
                        new URL(url);
                      } catch {
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Invalid Website URL",
                          message: "The company website URL is not valid.",
                        });
                        return false;
                      }
                    }}
                  />
                )}
                {isFavorite(company) ? (
                  <Action
                    title="Remove from Favorites"
                    icon={Icon.StarDisabled}
                    onAction={() => removeFromFavorites(company)}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                ) : (
                  <Action
                    title="Add to Favorites"
                    icon={Icon.Star}
                    onAction={() => addToFavorites(company)}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                  />
                )}
                <Action.CopyToClipboard
                  title="Copy Organization Number"
                  content={company.organizationNumber}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action.CopyToClipboard
                  title="Copy Company Name"
                  content={company.name}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

interface CompanyDetailsViewProps {
  company: Company;
  isLoading: boolean;
  onBack: () => void;
  isFavorite: boolean;
  onAddToFavorites: () => void;
  onRemoveFromFavorites: () => void;
}

function CompanyDetailsView({
  company,
  isLoading,
  onBack,
  isFavorite,
  onAddToFavorites,
  onRemoveFromFavorites,
}: CompanyDetailsViewProps) {
  const formatAddress = () => {
    const parts = [];
    if (company.address) parts.push(company.address);
    if (company.postalCode && company.city) {
      parts.push(`${company.postalCode} ${company.city}`);
    } else if (company.city) {
      parts.push(company.city);
    }
    return parts.join(", ");
  };

  const hasFinancialData = () => {
    return (
      company.accountingYear ||
      company.revenue ||
      company.operatingResult ||
      company.result ||
      company.totalAssets ||
      company.equity ||
      company.totalDebt ||
      company.ebitda ||
      company.depreciation ||
      company.employees ||
      company.isAudited !== undefined
    );
  };

  const markdown = `# ${company.name}

${company.description ? `${company.description}\n\n` : ""}

${
  !company.organizationNumber && !formatAddress() && !hasFinancialData() && !company.description
    ? `*Loading detailed information...*`
    : ""
}

---
*Data from Brønnøysundregistrene (The Brønnøysund Register Centre)*`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {company.organizationNumber && (
            <Detail.Metadata.Label title="Organization Number" text={company.organizationNumber} />
          )}

          {formatAddress() && <Detail.Metadata.Label title="Address" text={formatAddress()} />}

          {/* Business Information */}
          {company.industry && <Detail.Metadata.Label title="Industry" text={company.industry} />}

          {company.founded && <Detail.Metadata.Label title="Founded" text={company.founded} />}

          {company.employees && <Detail.Metadata.Label title="Employees" text={company.employees} />}

          {/* Contact Information */}
          {(company.phone || company.email || company.website) && <Detail.Metadata.Separator />}

          {company.phone && <Detail.Metadata.Label title="Phone" text={company.phone} />}

          {company.email && <Detail.Metadata.Label title="Email" text={company.email} />}

          {company.website && <Detail.Metadata.Link title="Website" target={company.website} text={company.website} />}

          {/* Financial Information */}
          {hasFinancialData() && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Annual Accounts" text="Årsregnskap" />

              {company.accountingYear && (
                <Detail.Metadata.Label title="Accounting Year" text={company.accountingYear} />
              )}

              {company.revenue && <Detail.Metadata.Label title="Revenue" text={company.revenue} />}

              {company.ebitda && <Detail.Metadata.Label title="EBITDA" text={company.ebitda} />}

              {company.operatingResult && (
                <Detail.Metadata.Label title="Operating Result" text={company.operatingResult} />
              )}

              {company.result && <Detail.Metadata.Label title="Net Result" text={company.result} />}

              {company.totalAssets && <Detail.Metadata.Label title="Total Assets" text={company.totalAssets} />}

              {company.equity && <Detail.Metadata.Label title="Equity" text={company.equity} />}

              {company.totalDebt && <Detail.Metadata.Label title="Total Debt" text={company.totalDebt} />}

              {company.depreciation && <Detail.Metadata.Label title="Depreciation" text={company.depreciation} />}

              {company.isAudited !== undefined && (
                <Detail.Metadata.Label title="Audited" text={company.isAudited ? "Yes" : "No"} />
              )}
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Brreg"
            url={company.bregUrl || "https://www.brreg.no"}
            onOpen={(url) => {
              try {
                new URL(url);
                return true;
              } catch {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Invalid URL",
                  message: "Could not open company page.",
                });
                return false;
              }
            }}
          />
          {company.website &&
            (() => {
              try {
                new URL(company.website);
                return (
                  <Action.OpenInBrowser
                    title="Open Company Website"
                    url={company.website}
                    shortcut={{ modifiers: ["cmd"], key: "l" }}
                  />
                );
              } catch {
                return (
                  <Action
                    title="Website URL Invalid"
                    icon={Icon.Warning}
                    onAction={() => {
                      showToast({
                        style: Toast.Style.Failure,
                        title: "Invalid Website URL",
                        message: `The website URL "${company.website}" is not valid.`,
                      });
                    }}
                  />
                );
              }
            })()}
          {isFavorite ? (
            <Action
              title="Remove from Favorites"
              icon={Icon.StarDisabled}
              onAction={onRemoveFromFavorites}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          ) : (
            <Action
              title="Add to Favorites"
              icon={Icon.Star}
              onAction={onAddToFavorites}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Organization Number"
            content={company.organizationNumber}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.CopyToClipboard
            title="Copy Company Name"
            content={company.name}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action title="Go Back" onAction={onBack} shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }} />
        </ActionPanel>
      }
    />
  );
}
