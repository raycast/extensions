import { API_BASE_URL } from "./constants";
import * as mock from "./mock-data";
import type {
  AccountsResponse,
  CardsResponse,
  CategoriesResponse,
  CreateCustomerRequest,
  CreateInvoiceRequest,
  CreateRecipientRequest,
  CreateTransferRequest,
  CreateWebhookRequest,
  CreditAccount,
  Customer,
  CustomersResponse,
  EventsResponse,
  Invoice,
  InvoicesResponse,
  MercuryAccount,
  Organization,
  Recipient,
  RecipientsResponse,
  SendPaymentRequest,
  StatementsResponse,
  TeamResponse,
  Transaction,
  TransactionFilters,
  TransactionsResponse,
  TreasuryResponse,
  UpdateTransactionRequest,
  WebhookEndpoint,
  WebhooksResponse,
} from "./types";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class MercuryApi {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private get isDemo(): boolean {
    return this.apiKey === "demo";
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${API_BASE_URL}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new ApiError(
        response.status,
        `Mercury API error ${response.status}: ${body || response.statusText}`,
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  // ─── Accounts ──────────────────────────────────────────────────────────────

  async getAccounts(): Promise<MercuryAccount[]> {
    if (this.isDemo) return mock.MOCK_ACCOUNTS;
    const res = await this.request<AccountsResponse | MercuryAccount[]>(
      "/accounts",
    );
    if (Array.isArray(res)) return res;
    return res.accounts ?? [];
  }

  async getAccount(accountId: string): Promise<MercuryAccount> {
    if (this.isDemo)
      return (
        mock.MOCK_ACCOUNTS.find((a) => a.id === accountId) ??
        mock.MOCK_ACCOUNTS[0]
      );
    return this.request<MercuryAccount>(`/account/${accountId}`);
  }

  // ─── Transactions ─────────────────────────────────────────────────────────

  async getTransactions(
    accountId: string,
    filters: TransactionFilters = {},
  ): Promise<Transaction[]> {
    if (this.isDemo) {
      let txns = mock.MOCK_TRANSACTIONS.filter(
        (t) => t.accountId === accountId,
      );
      if (filters.status)
        txns = txns.filter((t) => t.status === filters.status);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        txns = txns.filter(
          (t) =>
            t.counterpartyName.toLowerCase().includes(q) ||
            t.note?.toLowerCase().includes(q),
        );
      }
      if (filters.limit) txns = txns.slice(0, filters.limit);
      return txns;
    }
    const params = new URLSearchParams();
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.offset) params.set("offset", String(filters.offset));
    if (filters.status) params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);
    if (filters.start) params.set("start", filters.start);
    if (filters.end) params.set("end", filters.end);
    const query = params.toString();
    const res = await this.request<TransactionsResponse | Transaction[]>(
      `/account/${accountId}/transactions${query ? `?${query}` : ""}`,
    );
    if (Array.isArray(res)) return res;
    return res.transactions ?? [];
  }

  async getAllTransactions(
    filters: TransactionFilters = {},
  ): Promise<Transaction[]> {
    if (this.isDemo) {
      let txns = [...mock.MOCK_TRANSACTIONS];
      if (filters.status)
        txns = txns.filter((t) => t.status === filters.status);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        txns = txns.filter(
          (t) =>
            t.counterpartyName.toLowerCase().includes(q) ||
            t.note?.toLowerCase().includes(q),
        );
      }
      if (filters.limit) txns = txns.slice(0, filters.limit);
      return txns;
    }
    const accounts = await this.getAccounts();
    const activeAccounts = accounts.filter((a) => a.status === "active");
    const results = await Promise.all(
      activeAccounts.map((a) => this.getTransactions(a.id, filters)),
    );
    return results
      .flat()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  async getTransaction(transactionId: string): Promise<Transaction> {
    if (this.isDemo)
      return (
        mock.MOCK_TRANSACTIONS.find((t) => t.id === transactionId) ??
        mock.MOCK_TRANSACTIONS[0]
      );
    return this.request<Transaction>(`/transactions/${transactionId}`);
  }

  async updateTransaction(
    transactionId: string,
    data: UpdateTransactionRequest,
  ): Promise<Transaction> {
    if (this.isDemo) return this.getTransaction(transactionId);
    return this.request<Transaction>(`/transaction/${transactionId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // ─── Cards ────────────────────────────────────────────────────────────────

  async getCards(accountId: string): Promise<import("./types").Card[]> {
    if (this.isDemo) return mock.MOCK_CARDS;
    const res = await this.request<CardsResponse | import("./types").Card[]>(
      `/account/${accountId}/cards`,
    );
    if (Array.isArray(res)) return res;
    return res.cards ?? [];
  }

  async getAllCards(): Promise<import("./types").Card[]> {
    if (this.isDemo) return mock.MOCK_CARDS;
    const accounts = await this.getAccounts();
    const activeAccounts = accounts.filter((a) => a.status === "active");
    const results = await Promise.all(
      activeAccounts.map((a) => this.getCards(a.id)),
    );
    return results.flat();
  }

  // ─── Recipients ───────────────────────────────────────────────────────────

  async getRecipients(): Promise<Recipient[]> {
    if (this.isDemo) return mock.MOCK_RECIPIENTS;
    const res = await this.request<RecipientsResponse | Recipient[]>(
      "/recipients",
    );
    if (Array.isArray(res)) return res;
    return res.recipients ?? [];
  }

  async getRecipient(recipientId: string): Promise<Recipient> {
    if (this.isDemo)
      return (
        mock.MOCK_RECIPIENTS.find((r) => r.id === recipientId) ??
        mock.MOCK_RECIPIENTS[0]
      );
    return this.request<Recipient>(`/recipients/${recipientId}`);
  }

  async createRecipient(data: CreateRecipientRequest): Promise<Recipient> {
    if (this.isDemo) return mock.MOCK_RECIPIENTS[0];
    return this.request<Recipient>("/recipients", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ─── Payments ─────────────────────────────────────────────────────────────

  async sendPayment(
    accountId: string,
    data: SendPaymentRequest,
  ): Promise<Transaction> {
    if (this.isDemo) return mock.MOCK_TRANSACTIONS[0];
    return this.request<Transaction>(`/account/${accountId}/transactions`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async createTransfer(data: CreateTransferRequest): Promise<Transaction> {
    if (this.isDemo) return mock.MOCK_TRANSACTIONS[0];
    return this.request<Transaction>("/transfer", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ─── Invoices (AR) ────────────────────────────────────────────────────────

  async getInvoices(status?: string): Promise<Invoice[]> {
    if (this.isDemo) {
      if (status) return mock.MOCK_INVOICES.filter((i) => i.status === status);
      return mock.MOCK_INVOICES;
    }
    const params = status ? `?status=${status}` : "";
    const res = await this.request<InvoicesResponse | Invoice[]>(
      `/ar/invoices${params}`,
    );
    if (Array.isArray(res)) return res;
    return res.invoices ?? [];
  }

  async getInvoice(invoiceId: string): Promise<Invoice> {
    if (this.isDemo)
      return (
        mock.MOCK_INVOICES.find((i) => i.id === invoiceId) ??
        mock.MOCK_INVOICES[0]
      );
    return this.request<Invoice>(`/ar/invoices/${invoiceId}`);
  }

  async createInvoice(data: CreateInvoiceRequest): Promise<Invoice> {
    if (this.isDemo) return mock.MOCK_INVOICES[0];
    return this.request<Invoice>("/ar/invoices", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateInvoice(
    invoiceId: string,
    data: Partial<CreateInvoiceRequest>,
  ): Promise<Invoice> {
    if (this.isDemo) return this.getInvoice(invoiceId);
    return this.request<Invoice>(`/ar/invoices/${invoiceId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // ─── Customers (AR) ──────────────────────────────────────────────────────

  async getCustomers(): Promise<Customer[]> {
    if (this.isDemo) return mock.MOCK_CUSTOMERS;
    const res = await this.request<CustomersResponse | Customer[]>(
      "/ar/customers",
    );
    if (Array.isArray(res)) return res;
    return res.customers ?? [];
  }

  async getCustomer(customerId: string): Promise<Customer> {
    if (this.isDemo)
      return (
        mock.MOCK_CUSTOMERS.find((c) => c.id === customerId) ??
        mock.MOCK_CUSTOMERS[0]
      );
    return this.request<Customer>(`/ar/customers/${customerId}`);
  }

  async createCustomer(data: CreateCustomerRequest): Promise<Customer> {
    if (this.isDemo) return mock.MOCK_CUSTOMERS[0];
    return this.request<Customer>("/ar/customers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(
    customerId: string,
    data: Partial<CreateCustomerRequest>,
  ): Promise<Customer> {
    if (this.isDemo) return this.getCustomer(customerId);
    return this.request<Customer>(`/ar/customers/${customerId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // ─── Treasury ─────────────────────────────────────────────────────────────

  async getTreasury(): Promise<TreasuryResponse> {
    if (this.isDemo) return mock.MOCK_TREASURY;
    return this.request<TreasuryResponse>("/treasury");
  }

  // ─── Credit ───────────────────────────────────────────────────────────────

  async getCredit(): Promise<CreditAccount> {
    if (this.isDemo) return mock.MOCK_CREDIT;
    return this.request<CreditAccount>("/credit");
  }

  // ─── Organization ─────────────────────────────────────────────────────────

  async getOrganization(): Promise<Organization> {
    if (this.isDemo) return mock.MOCK_ORGANIZATION;
    return this.request<Organization>("/organization");
  }

  // ─── Team ─────────────────────────────────────────────────────────────────

  async getTeamMembers(): Promise<import("./types").TeamMember[]> {
    if (this.isDemo) return mock.MOCK_TEAM;
    const res = await this.request<
      TeamResponse | import("./types").TeamMember[]
    >("/users");
    if (Array.isArray(res)) return res;
    return res.users ?? [];
  }

  // ─── Statements ───────────────────────────────────────────────────────────

  async getStatements(
    accountId: string,
  ): Promise<import("./types").Statement[]> {
    if (this.isDemo) return mock.MOCK_STATEMENTS;
    const res = await this.request<
      StatementsResponse | import("./types").Statement[]
    >(`/account/${accountId}/statements`);
    if (Array.isArray(res)) return res;
    return res.statements ?? [];
  }

  async getStatementPdf(statementId: string): Promise<ArrayBuffer> {
    if (this.isDemo) return new ArrayBuffer(0);
    const url = `${API_BASE_URL}/statements/${statementId}/pdf`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!response.ok)
      throw new ApiError(response.status, `Failed to download statement`);
    return response.arrayBuffer();
  }

  // ─── Categories ───────────────────────────────────────────────────────────

  async getCategories(): Promise<import("./types").Category[]> {
    if (this.isDemo) return mock.MOCK_CATEGORIES;
    const res = await this.request<
      CategoriesResponse | import("./types").Category[]
    >("/categories");
    if (Array.isArray(res)) return res;
    return res.categories ?? [];
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  async getEvents(limit = 50, offset = 0): Promise<EventsResponse> {
    if (this.isDemo)
      return {
        events: mock.MOCK_EVENTS.slice(offset, offset + limit),
        page: undefined,
      };
    return this.request<EventsResponse>(
      `/events?limit=${limit}&offset=${offset}`,
    );
  }

  async getEvent(eventId: string): Promise<import("./types").MercuryEvent> {
    if (this.isDemo)
      return (
        mock.MOCK_EVENTS.find((e) => e.id === eventId) ?? mock.MOCK_EVENTS[0]
      );
    return this.request<import("./types").MercuryEvent>(`/events/${eventId}`);
  }

  // ─── Webhooks ─────────────────────────────────────────────────────────────

  async getWebhooks(): Promise<WebhookEndpoint[]> {
    if (this.isDemo) return mock.MOCK_WEBHOOKS;
    const res = await this.request<WebhooksResponse | WebhookEndpoint[]>(
      "/webhooks",
    );
    if (Array.isArray(res)) return res;
    return res.webhooks ?? [];
  }

  async createWebhook(data: CreateWebhookRequest): Promise<WebhookEndpoint> {
    if (this.isDemo) return mock.MOCK_WEBHOOKS[0];
    return this.request<WebhookEndpoint>("/webhooks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateWebhook(
    webhookId: string,
    data: Partial<CreateWebhookRequest>,
  ): Promise<WebhookEndpoint> {
    if (this.isDemo) return mock.MOCK_WEBHOOKS[0];
    return this.request<WebhookEndpoint>(`/webhooks/${webhookId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    if (this.isDemo) return;
    await this.request<void>(`/webhooks/${webhookId}`, { method: "DELETE" });
  }
}