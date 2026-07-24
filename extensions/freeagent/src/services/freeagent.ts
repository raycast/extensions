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
  ProjectResponse,
  ProjectCreateData,
  Task,
  TasksResponse,
  TaskCreateData,
  TaskResponse,
  TaskUpdateData,
  TimeslipUpdateData,
  TimeslipFilterOptions,
  ExpenseCreateData,
  ExpenseResponse,
  Expense,
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

  // Some endpoints return an empty body (e.g. 204 No Content, or DELETE).
  // Reading the text first lets us skip JSON parsing when there's nothing to
  // parse, rather than throwing on an empty body.
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// FreeAgent paginates list endpoints (default 25, max 100 per page). This
// fetches every page and concatenates the results so callers get the full set.
async function fetchAllPages<T, R>(
  endpoint: string,
  accessToken: string,
  extract: (data: R) => T[] | undefined,
): Promise<T[]> {
  const perPage = 100;
  const separator = endpoint.includes("?") ? "&" : "?";
  const results: T[] = [];

  for (let page = 1; ; page++) {
    const data = await makeRequest<R>(`${endpoint}${separator}per_page=${perPage}&page=${page}`, accessToken);
    const items = extract(data) || [];
    results.push(...items);

    // A short page means we've reached the end.
    if (items.length < perPage) break;
  }

  return results;
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

export async function fetchTimeslipsFiltered(
  accessToken: string,
  options: TimeslipFilterOptions = {},
): Promise<Timeslip[]> {
  const params = new URLSearchParams();
  params.set("view", options.view ?? "all");
  params.set("sort", "-dated_on");
  if (options.project) params.set("project", options.project);
  if (options.task) params.set("task", options.task);
  if (options.user) params.set("user", options.user);
  if (options.fromDate) params.set("from_date", options.fromDate);
  if (options.toDate) params.set("to_date", options.toDate);
  if (options.nested) params.set("nested", "true");

  return fetchAllPages<Timeslip, TimeslipsResponse>(
    `/timeslips?${params.toString()}`,
    accessToken,
    (data) => data.timeslips,
  );
}

export async function fetchTimeslip(accessToken: string, timeslipId: string): Promise<Timeslip> {
  const data = await makeRequest<TimeslipResponse>(`/timeslips/${timeslipId}`, accessToken);
  return data.timeslip;
}

export async function updateTimeslip(
  accessToken: string,
  timeslipId: string,
  timeslipData: TimeslipUpdateData,
): Promise<Timeslip> {
  const data = await makeRequest<TimeslipResponse>(`/timeslips/${timeslipId}`, accessToken, {
    method: "PUT",
    body: JSON.stringify({ timeslip: timeslipData }),
  });
  return data.timeslip;
}

export async function deleteTimeslip(accessToken: string, timeslipId: string): Promise<void> {
  await makeRequest<void>(`/timeslips/${timeslipId}`, accessToken, { method: "DELETE" });
}

export async function fetchProjects(accessToken: string, view: "active" | "all" = "active"): Promise<Project[]> {
  return fetchAllPages<Project, ProjectsResponse>(`/projects?view=${view}`, accessToken, (data) => data.projects);
}

export async function fetchProject(accessToken: string, projectId: string): Promise<Project> {
  const data = await makeRequest<ProjectResponse>(`/projects/${projectId}`, accessToken);
  return data.project;
}

export async function createProject(accessToken: string, projectData: ProjectCreateData): Promise<Project> {
  const data = await makeRequest<ProjectResponse>("/projects", accessToken, {
    method: "POST",
    body: JSON.stringify({ project: projectData }),
  });
  return data.project;
}

export async function deleteProject(accessToken: string, projectId: string): Promise<void> {
  await makeRequest<void>(`/projects/${projectId}`, accessToken, { method: "DELETE" });
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
  return fetchAllPages<Task, TasksResponse>(endpoint, accessToken, (data) => data.tasks);
}

export async function fetchTask(accessToken: string, taskId: string): Promise<Task> {
  const data = await makeRequest<TaskResponse>(`/tasks/${taskId}`, accessToken);
  return data.task;
}

export async function updateTask(accessToken: string, taskId: string, taskData: TaskUpdateData): Promise<Task> {
  const data = await makeRequest<TaskResponse>(`/tasks/${taskId}`, accessToken, {
    method: "PUT",
    body: JSON.stringify({ task: taskData }),
  });
  return data.task;
}

export async function deleteTask(accessToken: string, taskId: string): Promise<void> {
  await makeRequest<void>(`/tasks/${taskId}`, accessToken, { method: "DELETE" });
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

export async function createExpense(accessToken: string, expenseData: ExpenseCreateData): Promise<Expense> {
  const data = await makeRequest<ExpenseResponse>("/expenses", accessToken, {
    method: "POST",
    body: JSON.stringify({ expense: expenseData }),
  });
  return data.expense;
}

export async function createTask(accessToken: string, projectUrl: string, taskData: TaskCreateData): Promise<Task> {
  const data = await makeRequest<TaskResponse>(`/tasks?project=${encodeURIComponent(projectUrl)}`, accessToken, {
    method: "POST",
    body: JSON.stringify({ task: taskData }),
  });
  return data.task;
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
