import {
  CompanyInfo,
  CompanyResponse,
  User,
  UserResponse,
  Invoice,
  InvoicesResponse,
  Contact,
  ContactsResponse,
  TimelineItem,
  TimelineResponse,
  Timeslip,
  TimeslipsResponse,
  BankAccount,
  BankAccountsResponse,
  BankTransaction,
  BankTransactionsResponse,
  BankTransactionResponse,
  BankTransactionUpdateData,
  InvoiceCreateData,
  InvoiceResponse,
  Project,
  ProjectsResponse,
  Task,
  TasksResponse,
  TimeslipCreateData,
  TimeslipResponse,
  Category,
  CategoriesResponse,
  BankTransactionExplanation,
  BankTransactionExplanationResponse,
  BankTransactionExplanationCreateData,
  BankTransactionExplanationUpdateData,
  AttachmentUploadData,
  Attachment,
  AttachmentResponse,
} from "../types";

const BASE_URL = "https://api.FreeAgent.com/v2";
const USER_AGENT = "Raycast FreeAgent Extension";

class FreeAgentError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "FreeAgentError";
  }
}

async function makeRequest<T>(endpoint: string, accessToken: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": USER_AGENT,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new FreeAgentError(`HTTP error! status: ${response.status}`, response.status);
  }

  return response.json();
}

export async function getCurrentUser(accessToken: string): Promise<User> {
  const data = await makeRequest<UserResponse>("/users/me", accessToken);
  return data.user;
}

export async function getCompanyInfo(accessToken: string): Promise<CompanyInfo> {
  const data = await makeRequest<CompanyResponse>("/company", accessToken);
  return data.company;
}

export async function fetchInvoices(accessToken: string): Promise<Invoice[]> {
  const data = await makeRequest<InvoicesResponse>("/invoices?sort=-created_at", accessToken);
  return data.invoices || [];
}

export async function fetchContacts(accessToken: string, view: "active" | "all" = "active"): Promise<Contact[]> {
  const data = await makeRequest<ContactsResponse>(`/contacts?view=${view}`, accessToken);
  return data.contacts || [];
}

export async function fetchTimelineItems(accessToken: string): Promise<TimelineItem[]> {
  const data = await makeRequest<TimelineResponse>("/company/tax_timeline", accessToken);
  return data.timeline_items || [];
}

export async function fetchBankAccounts(
  accessToken: string,
  view?: "standard_bank_accounts" | "credit_card_accounts" | "paypal_accounts",
): Promise<BankAccount[]> {
  let endpoint = "/bank_accounts";

  if (view) {
    endpoint += `?view=${view}`;
  }

  const data = await makeRequest<BankAccountsResponse>(endpoint, accessToken);
  return data.bank_accounts || [];
}

export async function fetchBankTransactions(
  accessToken: string,
  bankAccount: string,
  view?: "all" | "unexplained" | "explained" | "manual" | "imported" | "marked_for_review",
  fromDate?: string,
  toDate?: string,
): Promise<BankTransaction[]> {
  let endpoint = `/bank_transactions?bank_account=${encodeURIComponent(bankAccount)}`;

  if (view && view !== "all") {
    endpoint += `&view=${view}`;
  }
  if (fromDate) {
    endpoint += `&from_date=${fromDate}`;
  }
  if (toDate) {
    endpoint += `&to_date=${toDate}`;
  }

  const data = await makeRequest<BankTransactionsResponse>(endpoint, accessToken);
  return data.bank_transactions.map((x) => ({
    ...x,
    status: view,
  }));
}

export async function fetchTimeslips(
  accessToken: string,
  view: "all" | "unbilled" | "running" = "all",
  nested: boolean = false,
): Promise<Timeslip[]> {
  const nestedParam = nested ? "&nested=true" : "";
  const data = await makeRequest<TimeslipsResponse>(
    `/timeslips?view=${view}&sort=-dated_on${nestedParam}`,
    accessToken,
  );
  return data.timeslips || [];
}

export async function fetchProjects(accessToken: string, view: "active" | "all" = "active"): Promise<Project[]> {
  const data = await makeRequest<ProjectsResponse>(`/projects?view=${view}`, accessToken);
  return data.projects || [];
}

export async function fetchTasks(
  accessToken: string,
  projectUrl?: string,
  view: "active" | "all" = "active",
): Promise<Task[]> {
  let endpoint = `/tasks?view=${view}`;
  if (projectUrl) {
    endpoint += `&project=${encodeURIComponent(projectUrl)}`;
  }
  const data = await makeRequest<TasksResponse>(endpoint, accessToken);
  return data.tasks || [];
}

export async function createInvoice(accessToken: string, invoiceData: InvoiceCreateData): Promise<Invoice> {
  const data = await makeRequest<InvoiceResponse>("/invoices", accessToken, {
    method: "POST",
    body: JSON.stringify({ invoice: invoiceData }),
  });
  return data.invoice;
}

export async function createTimeslip(accessToken: string, timeslipData: TimeslipCreateData): Promise<Timeslip> {
  const data = await makeRequest<TimeslipResponse>("/timeslips", accessToken, {
    method: "POST",
    body: JSON.stringify({ timeslip: timeslipData }),
  });
  return data.timeslip;
}

export async function fetchCategories(accessToken: string): Promise<Category[]> {
  const data = await makeRequest<CategoriesResponse>("/categories", accessToken);

  // Combine all category types into a single array
  const allCategories: Category[] = [];

  if (data.admin_expenses_categories) {
    allCategories.push(...data.admin_expenses_categories);
  }
  if (data.cost_of_sales_categories) {
    allCategories.push(...data.cost_of_sales_categories);
  }
  if (data.income_categories) {
    allCategories.push(...data.income_categories);
  }
  if (data.general_categories) {
    allCategories.push(...data.general_categories);
  }

  return allCategories;
}

export async function createBankTransactionExplanation(
  accessToken: string,
  explanationData: BankTransactionExplanationCreateData,
): Promise<BankTransactionExplanation> {
  const data = await makeRequest<BankTransactionExplanationResponse>("/bank_transaction_explanations", accessToken, {
    method: "POST",
    body: JSON.stringify({ bank_transaction_explanation: explanationData }),
  });
  return data.bank_transaction_explanation;
}

export async function getBankTransactionExplanation(
  accessToken: string,
  explanationId: string,
): Promise<BankTransactionExplanation> {
  const data = await makeRequest<BankTransactionExplanationResponse>(
    `/bank_transaction_explanations/${explanationId}`,
    accessToken,
  );
  return data.bank_transaction_explanation;
}

export async function updateBankTransactionExplanation(
  accessToken: string,
  explanationId: string,
  explanationData: BankTransactionExplanationUpdateData,
): Promise<BankTransactionExplanation> {
  const data = await makeRequest<BankTransactionExplanationResponse>(
    `/bank_transaction_explanations/${explanationId}`,
    accessToken,
    {
      method: "PUT",
      body: JSON.stringify({ bank_transaction_explanation: explanationData }),
    },
  );
  return data.bank_transaction_explanation;
}

export async function uploadAttachment(accessToken: string, attachmentData: AttachmentUploadData): Promise<Attachment> {
  const data = await makeRequest<AttachmentResponse>("/attachments", accessToken, {
    method: "POST",
    body: JSON.stringify({ attachment: attachmentData }),
  });
  return data.attachment;
}

export async function updateBankTransaction(
  accessToken: string,
  transactionId: string,
  transactionData: BankTransactionUpdateData,
): Promise<BankTransaction> {
  const data = await makeRequest<BankTransactionResponse>(`/bank_transactions/${transactionId}`, accessToken, {
    method: "PUT",
    body: JSON.stringify({ bank_transaction: transactionData }),
  });
  return data.bank_transaction;
}

export { FreeAgentError };
