import { callTool } from "./cosign-mcp";
import type {
  FundingPage,
  InvestmentsPage,
  InvestmentsQuery,
  JobsPage,
  OrganizationDetail,
  PersonDetail,
} from "./types";

export const fetchPerson = (ref: { nomineeId?: string; handle?: string }) =>
  callTool<PersonDetail>("get_person", { ...ref, reason_for_call: "User opened a person in the Raycast extension" });

export const fetchOrganization = (organizationId: string) =>
  callTool<OrganizationDetail>("get_organization", {
    organizationId,
    reason_for_call: "User opened a company in the Raycast extension",
  });

export const fetchFunding = (organizationId: string) =>
  callTool<FundingPage>("get_company_funding", {
    organizationId,
    reason_for_call: "User opened a company's funding history in the Raycast extension",
  });

export const fetchJobs = (companyId: string, cursor?: string) =>
  callTool<JobsPage>("search_jobs", {
    companyId,
    limit: 10,
    ...(cursor ? { cursor } : {}),
    reason_for_call: "User opened a company's open roles in the Raycast extension",
  });

export const fetchInvestments = (query: InvestmentsQuery, cursor: string | null = null) =>
  callTool<InvestmentsPage>("get_investments", {
    companyOrganizationId: null,
    investorNomineeId: null,
    investorOrganizationId: null,
    ...query,
    cursor,
    reason_for_call: "User opened an investment list (investors or portfolio) in the Raycast extension",
  });
