import { Action, ActionPanel, Form, Icon, LaunchProps, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { EnrichedData, ResultsView, mapResponseToEnrichedData } from "./email-finder";
import { AuthGate } from "./auth";
import { searchPerson, enrichPerson, SearchPersonResponse } from "./backend";
import { fetchCredits, formatCredits } from "./credits";
import { CompanySearch } from "./company-search";
import {
  addCompanySearchHistoryEntry,
  addSearchHistoryEntry,
  CachedEmployee,
  updateCompanySearchHistoryEntry,
} from "./history-storage";

// * Types
interface Arguments {
  domain?: string;
}

// * Employee with department info and page tracking
interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  jobTitle: string;
  departments: string[];
  linkedinUrl?: string;
  location?: string;
  seniority?: string;
  pageNumber: number; // Track which page this employee was loaded from
}

// * Map search response to employees
function mapSearchResponseToEmployees(response: SearchPersonResponse, pageNumber: number): Employee[] {
  if (!response.results || response.results.length === 0) {
    return [];
  }

  return response.results.map((item) => {
    const person = item.person;
    // * Extract current job info
    const currentJob = person.job_history?.find((job) => job.current);
    const departments = currentJob?.departments ?? [];

    return {
      id: person.person_id,
      firstName: person.first_name,
      lastName: person.last_name,
      fullName: person.full_name,
      jobTitle: person.current_job_title || currentJob?.title || "",
      departments: departments.length > 0 ? departments : ["Other"],
      linkedinUrl: person.linkedin_url,
      location: person.location ? `${person.location.city}, ${person.location.country}` : undefined,
      seniority: currentJob?.seniority,
      pageNumber,
    };
  });
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  return <AuthGate>{(signOut) => <CompanyEmployeesEntry signOut={signOut} arguments={props.arguments} />}</AuthGate>;
}

// * Entry point - decides which view to show based on arguments
function CompanyEmployeesEntry({ signOut, arguments: args }: { signOut: () => Promise<void>; arguments: Arguments }) {
  const { domain: argDomain } = args;

  // * If domain is provided, go directly to employee list
  if (argDomain) {
    return <EmployeeListView signOut={signOut} initialDomain={argDomain} autoSearch={true} />;
  }

  // * Otherwise, show company search which uses Action.Push to navigate to list
  return <EmployeesCompanySearch signOut={signOut} />;
}

// * Company Search for Employees - uses Action.Push for navigation
function EmployeesCompanySearch({ signOut }: { signOut: () => Promise<void> }) {
  // * Use callback-based CompanySearch but handle the callback to push the next view
  const { push } = useNavigation();

  function handleCompanySelect(company: { domain: string; name: string; logo_url?: string; confidence_score: number }) {
    push(
      <EmployeeListView
        signOut={signOut}
        initialDomain={company.domain}
        companyInfo={{ name: company.name, logoUrl: company.logo_url, confidenceScore: company.confidence_score }}
        autoSearch={true}
      />,
    );
  }

  function handleEnterManually() {
    push(<DomainEntryForm signOut={signOut} />);
  }

  return (
    <CompanySearch onSelectCompany={handleCompanySelect} onEnterManually={handleEnterManually} signOut={signOut} />
  );
}

// * Domain Entry Form - for manual domain entry
function DomainEntryForm({ signOut }: { signOut: () => Promise<void> }) {
  const { push } = useNavigation();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    fetchCredits()
      .then(setCredits)
      .catch(() => setCredits(null));
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Search Company"
            onSubmit={(values) => {
              push(<EmployeeListView signOut={signOut} initialDomain={values.domain} autoSearch={true} />);
            }}
          />
          <Action title="Sign out" icon={Icon.Logout} onAction={signOut} />
        </ActionPanel>
      }
    >
      <Form.Description title="Credits" text={credits !== null ? formatCredits(credits) : "Loading..."} />
      <Form.Separator />
      <Form.TextField id="domain" title="Company Domain" placeholder="rebtel.com" autoFocus />
    </Form>
  );
}

// * Employee List View - shows employees grouped by page
function EmployeeListView({
  signOut,
  initialDomain,
  companyInfo,
  autoSearch = false,
}: {
  signOut: () => Promise<void>;
  initialDomain: string;
  companyInfo?: { name: string; logoUrl?: string; confidenceScore: number };
  autoSearch?: boolean;
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [credits, setCredits] = useState<number | null>(null);
  const [filterText, setFilterText] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [historyEntryId, setHistoryEntryId] = useState<string | null>(null);

  // * Fetch credits on mount
  useEffect(() => {
    fetchCredits()
      .then(setCredits)
      .catch(() => setCredits(null));
  }, []);

  // * Auto-search on mount if requested
  useEffect(() => {
    if (autoSearch && !hasSearched && !isLoading) {
      searchCompany(initialDomain, companyInfo);
    }
  }, [autoSearch, hasSearched, isLoading]);

  // * Filter employees client-side by department
  const filteredEmployees =
    departmentFilter === "all" ? employees : employees.filter((e) => e.departments.includes(departmentFilter));

  async function searchCompany(
    searchDomain: string,
    company?: { name: string; logoUrl?: string; confidenceScore: number },
  ) {
    if (!searchDomain.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: "Please enter a domain" });
      return;
    }

    setIsLoading(true);
    setEmployees([]);
    setHasSearched(true);
    setCurrentPage(0);
    setTotalPages(0);
    setTotalResults(0);
    setHistoryEntryId(null);

    showToast({ style: Toast.Style.Animated, title: "Searching...", message: `Finding employees at ${searchDomain}` });

    try {
      const response = await searchPerson(searchDomain, 1);

      if (typeof response.balance === "number") {
        setCredits(response.balance);
      }

      const mappedEmployees = mapSearchResponseToEmployees(response, 1);
      setEmployees(mappedEmployees);

      // * Handle pagination with intelligent fallbacks
      // * Try new field names first, then fall back to old names
      const pageFromApi = response.pagination?.current_page ?? response.pagination?.page ?? 1;
      const totalPagesFromApi = response.pagination?.total_page ?? response.pagination?.total_pages ?? 0;
      const totalResultsFromApi = response.pagination?.total_count ?? response.pagination?.total_results ?? 0;

      // * FALLBACK LOGIC: If pagination is missing but we have results
      // * Assume more pages exist if we got exactly 25 results (typical page size)
      const hasResults = mappedEmployees.length > 0;
      const likelyHasMorePages = mappedEmployees.length === 25;
      const paginationMissing = !response.pagination || totalPagesFromApi === 0;

      if (paginationMissing && hasResults) {
        // If we got exactly 25 results, assume there might be more
        setCurrentPage(1);
        setTotalPages(likelyHasMorePages ? 999 : 1); // Use large number to enable "Load More"
        setTotalResults(likelyHasMorePages ? mappedEmployees.length : mappedEmployees.length);
      } else {
        setCurrentPage(pageFromApi);
        setTotalPages(totalPagesFromApi);
        setTotalResults(totalResultsFromApi);
      }

      // * Save to history with employee data
      if (mappedEmployees.length > 0) {
        const cachedEmployees: CachedEmployee[] = mappedEmployees.map((e) => ({
          id: e.id,
          firstName: e.firstName,
          lastName: e.lastName,
          fullName: e.fullName,
          jobTitle: e.jobTitle,
          departments: e.departments,
          linkedinUrl: e.linkedinUrl,
          location: e.location,
          seniority: e.seniority,
        }));

        const historyEntry = await addCompanySearchHistoryEntry({
          companyName: company?.name || searchDomain,
          domain: searchDomain,
          confidenceScore: company?.confidenceScore ?? 100,
          logoUrl: company?.logoUrl,
          employees: cachedEmployees,
          totalPages: response.pagination?.total_page ?? response.pagination?.total_pages ?? 1,
          currentPage: response.pagination?.current_page ?? response.pagination?.page ?? 1,
          totalEmployees: response.pagination?.total_count ?? response.pagination?.total_results ?? 0,
        });

        // Save the history entry ID for later updates
        setHistoryEntryId(historyEntry.id);
      }

      if (mappedEmployees.length === 0) {
        showToast({ style: Toast.Style.Failure, title: "No Results", message: "No employees found for this domain" });
      } else {
        const total = response.pagination?.total_count ?? response.pagination?.total_results ?? 0;
        const pages = response.pagination?.total_page ?? response.pagination?.total_pages ?? 1;

        // Show appropriate message based on whether pagination data exists
        if (!response.pagination || total === 0) {
          showToast({
            style: Toast.Style.Success,
            title: "Found",
            message: `Showing ${mappedEmployees.length} employees${likelyHasMorePages ? " (may have more pages)" : ""}`,
          });
        } else {
          showToast({
            style: Toast.Style.Success,
            title: "Found",
            message: `Showing ${mappedEmployees.length} of ${total} total employees (page 1/${pages})`,
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      showToast({ style: Toast.Style.Failure, title: "Failed", message });
      fetchCredits()
        .then(setCredits)
        .catch(() => {});
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMoreEmployees() {
    if (isLoading) return;

    // For fallback mode, check if we should stop (totalPages = 999)
    const inFallbackMode = totalPages === 999;
    if (!inFallbackMode && currentPage >= totalPages) return;

    setIsLoading(true);
    showToast({ style: Toast.Style.Animated, title: "Loading more...", message: `Page ${currentPage + 1}` });

    try {
      const response = await searchPerson(initialDomain, currentPage + 1);

      if (typeof response.balance === "number") {
        setCredits(response.balance);
      }

      const newMappedEmployees = mapSearchResponseToEmployees(response, currentPage + 1);

      // * If we got 0 results, we've reached the end
      if (newMappedEmployees.length === 0) {
        showToast({
          style: Toast.Style.Success,
          title: "Done",
          message: "No more employees found",
        });
        setTotalPages(currentPage); // Update to stop showing load more
        return;
      }

      // * Dedupe by employee id
      const existingIds = new Set(employees.map((e) => e.id));
      const newEmployees = newMappedEmployees.filter((e) => !existingIds.has(e.id));

      const updatedEmployees = [...employees, ...newEmployees];
      setEmployees(updatedEmployees);

      // Update pagination (try new field names first, then old names)
      const newPage = response.pagination?.current_page ?? response.pagination?.page ?? currentPage + 1;
      setCurrentPage(newPage);

      // If pagination data exists, use it; otherwise update our fallback
      const totalPagesFromResponse = response.pagination?.total_page ?? response.pagination?.total_pages;
      const totalCountFromResponse = response.pagination?.total_count ?? response.pagination?.total_results;

      if (totalPagesFromResponse) {
        setTotalPages(totalPagesFromResponse);
        setTotalResults(totalCountFromResponse ?? 0);
      } else if (newMappedEmployees.length < 25) {
        // If we got less than 25, this is likely the last page
        setTotalPages(newPage);
        setTotalResults(updatedEmployees.length);
      } else {
        setTotalResults(updatedEmployees.length);
      }

      const loadedCount = updatedEmployees.length;
      showToast({
        style: Toast.Style.Success,
        title: "Loaded",
        message:
          totalResults > 0
            ? `Now showing ${loadedCount} of ${totalResults} total employees`
            : `Now showing ${loadedCount} employees`,
      });

      // * Update history entry with all accumulated employees
      if (historyEntryId) {
        const cachedEmployees: CachedEmployee[] = updatedEmployees.map((e) => ({
          id: e.id,
          firstName: e.firstName,
          lastName: e.lastName,
          fullName: e.fullName,
          jobTitle: e.jobTitle,
          departments: e.departments,
          linkedinUrl: e.linkedinUrl,
          location: e.location,
          seniority: e.seniority,
        }));

        await updateCompanySearchHistoryEntry(historyEntryId, {
          employees: cachedEmployees,
          currentPage: newPage,
          totalPages: totalPagesFromResponse ?? totalPages,
          totalEmployees: totalCountFromResponse ?? totalResults,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      showToast({ style: Toast.Style.Failure, title: "Failed", message });
      fetchCredits()
        .then(setCredits)
        .catch(() => {});
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter employees..."
      navigationTitle={initialDomain ? `Employees at ${initialDomain}` : "Company Employees"}
      searchText={filterText}
      onSearchTextChange={setFilterText}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Department" value={departmentFilter} onChange={setDepartmentFilter}>
          <List.Dropdown.Item title="All Departments" value="all" />
          <List.Dropdown.Section title="Departments">
            <List.Dropdown.Item title="C-Suite" value="C-Suite" />
            <List.Dropdown.Item title="Product" value="Product" />
            <List.Dropdown.Item title="Engineering & Technical" value="Engineering & Technical" />
            <List.Dropdown.Item title="Design" value="Design" />
            <List.Dropdown.Item title="Education & Coaching" value="Education & Coaching" />
            <List.Dropdown.Item title="Finance" value="Finance" />
            <List.Dropdown.Item title="Human Resources" value="Human Resources" />
            <List.Dropdown.Item title="Information Technology" value="Information Technology" />
            <List.Dropdown.Item title="Legal" value="Legal" />
            <List.Dropdown.Item title="Marketing" value="Marketing" />
            <List.Dropdown.Item title="Medical & Health" value="Medical & Health" />
            <List.Dropdown.Item title="Consulting" value="Consulting" />
            <List.Dropdown.Item title="Sales" value="Sales" />
            <List.Dropdown.Item title="Operations" value="Operations" />
            <List.Dropdown.Item title="Other" value="Other" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!hasSearched || employees.length === 0 ? (
        <List.EmptyView
          title={hasSearched ? "No Employees Found" : "Search for a Company"}
          description={hasSearched ? "No employees found for this domain" : "Enter a company domain to find employees"}
          icon={Icon.Person}
        />
      ) : (
        <>
          {filteredEmployees.length === 0 && departmentFilter !== "all" && (
            <List.Item
              title={`No ${departmentFilter} employees loaded yet`}
              subtitle="Load more to find people in this department"
              icon={Icon.Person}
            />
          )}
          {filteredEmployees.map((employee) => (
            <List.Item
              key={employee.id}
              title={employee.fullName}
              subtitle={employee.jobTitle}
              icon={Icon.Person}
              accessories={[
                employee.seniority ? { tag: employee.seniority } : {},
                employee.location ? { text: employee.location, icon: Icon.Pin } : {},
              ].filter((a) => Object.keys(a).length > 0)}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Reveal Email"
                    icon={Icon.Envelope}
                    target={
                      <EnrichedEmployeeView
                        signOut={signOut}
                        employee={employee}
                        domain={initialDomain}
                        credits={credits}
                      />
                    }
                  />
                  {employee.linkedinUrl && (
                    <>
                      <Action.OpenInBrowser
                        title="Open LinkedIn"
                        url={employee.linkedinUrl}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy LinkedIn URL"
                        content={employee.linkedinUrl}
                        shortcut={{ modifiers: ["cmd"], key: "l" }}
                      />
                    </>
                  )}
                  <Action title="Sign out" icon={Icon.Logout} onAction={signOut} />
                </ActionPanel>
              }
            />
          ))}

          {/* Load More button */}
          {currentPage < totalPages && (
            <List.Item
              title="Show More Employees"
              subtitle={
                totalResults > 0 ? `${employees.length} of ${totalResults} loaded` : `Load page ${currentPage + 1}`
              }
              icon={Icon.ArrowDown}
              accessories={[
                totalResults > employees.length
                  ? { tag: { value: `${totalResults - employees.length} more`, color: "#FF6F00" } }
                  : { tag: { value: "Load more", color: "#FF6F00" } },
              ]}
              actions={
                <ActionPanel>
                  <Action title="Load Next Page" icon={Icon.Download} onAction={loadMoreEmployees} />
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  );
}

// * Enriched Employee View - fetches and displays enriched person data
function EnrichedEmployeeView({
  signOut,
  employee,
  domain,
  credits: initialCredits,
}: {
  signOut: () => Promise<void>;
  employee: Employee;
  domain: string;
  credits: number | null;
}) {
  const [enrichedData, setEnrichedData] = useState<EnrichedData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [credits, setCredits] = useState<number | null>(initialCredits);
  const hasStartedRef = useRef(false);

  // * Fetch enriched data on mount
  useEffect(() => {
    // Prevent duplicate requests from React Strict Mode double-mounting
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    let cancelled = false;

    async function fetchEnrichedData() {
      showToast({
        style: Toast.Style.Animated,
        title: "Revealing...",
        message: `Getting email for ${employee.fullName}`,
      });

      try {
        const response = await enrichPerson(employee.firstName, employee.lastName, domain);

        if (cancelled) return;

        if (typeof response.balance === "number") {
          setCredits(response.balance);
        }

        const mappedData = mapResponseToEnrichedData(response, domain);
        if (!mappedData) {
          throw new Error("No email found for this person");
        }

        setEnrichedData(mappedData);

        // * Save to email search history
        await addSearchHistoryEntry({
          firstName: employee.firstName,
          lastName: employee.lastName,
          domain,
          status: "success",
          email: mappedData.person.email.email,
          enrichedData: mappedData,
        });

        showToast({ style: Toast.Style.Success, title: "Found", message: mappedData.person.email.email });
      } catch (err) {
        if (cancelled) return;

        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);

        // * Save failed search to history too
        await addSearchHistoryEntry({
          firstName: employee.firstName,
          lastName: employee.lastName,
          domain,
          status: "error",
          error: message,
        });

        showToast({ style: Toast.Style.Failure, title: "Failed", message });
        fetchCredits()
          .then(setCredits)
          .catch(() => {});
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchEnrichedData();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ResultsView
      data={enrichedData}
      isLoading={isLoading}
      error={error}
      searchParams={{ firstName: employee.firstName, lastName: employee.lastName, domain }}
      credits={credits}
      signOut={signOut}
    />
  );
}
