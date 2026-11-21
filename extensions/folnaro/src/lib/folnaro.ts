import { FolnaroError } from "./errors";
import type { ToolClient } from "./mcp-client";
import type {
  CreateDraftInput,
  CreateExpenseInput,
  Customer,
  CustomersResult,
  DocumentDetail,
  DocumentKind,
  DocumentPdfResult,
  DocumentSummary,
  DocumentsListResult,
  Expense,
  ExpenseResult,
  ExpensesResult,
  Project,
  ProjectsResult,
  ReceiptFileResult,
  RunningTimerResult,
  StartTimerInput,
  TimeEntry,
  TimeEntryResult,
  TimeListResult,
} from "./types";

export const INVOICE_KINDS: DocumentKind[] = [
  "invoice",
  "partialInvoice",
  "finalInvoice",
  "creditNote",
  "cancellation",
];
export const QUOTE_KINDS: DocumentKind[] = ["quote", "orderConfirmation"];

/** Typed calls of the folnaro-mcp tools the extension needs. Names and arguments: docs/mcp/*.md. */
export class FolnaroApi {
  constructor(readonly client: ToolClient) {}

  /** Tools the user currently allows; a write tool missing here has its switch off. */
  allowedTools(): Promise<Set<string>> {
    return this.client.listToolNames();
  }

  async documents(
    options: { query?: string; kinds?: DocumentKind[]; limit?: number } = {},
  ): Promise<DocumentSummary[]> {
    const args: Record<string, unknown> = { limit: options.limit ?? 30 };
    if (options.query) args.query = options.query;
    if (options.kinds?.length) args.kind = options.kinds;
    const { data } = await this.client.callTool<DocumentsListResult>("documents_list", args);
    return data.documents;
  }

  async customers(options: { query?: string; limit?: number } = {}): Promise<Customer[]> {
    const args: Record<string, unknown> = { limit: options.limit ?? 50 };
    if (options.query) args.query = options.query;
    const { data } = await this.client.callTool<CustomersResult>("customers_search", args);
    return data.customers;
  }

  async projects(options: { customerId?: string } = {}): Promise<Project[]> {
    const args: Record<string, unknown> = {};
    if (options.customerId) args.customer_id = options.customerId;
    const { data } = await this.client.callTool<ProjectsResult>("projects_list", args);
    return data.projects;
  }

  async expenses(options: { query?: string; limit?: number } = {}): Promise<Expense[]> {
    const args: Record<string, unknown> = { limit: options.limit ?? 20 };
    if (options.query) args.query = options.query;
    const { data } = await this.client.callTool<ExpensesResult>("expenses_list", args);
    return data.expenses;
  }

  /**
   * The PDF of a document: finalized ones return the archived copy, drafts a watermarked preview.
   * The helper attaches the bytes as an embedded resource (`blob`, base64); `archive_path` is
   * relative to the sandboxed archive, so the bytes are the only way to reach the file.
   */
  async documentPdf(id: string): Promise<{ meta: DocumentPdfResult; bytes: Buffer }> {
    const { data, content } = await this.client.callTool<DocumentPdfResult>(
      "documents_pdf",
      { id, include_content: true },
      30000,
    );
    const blob = content.find((block) => block.type === "resource" && block.resource?.blob)?.resource?.blob;
    if (!blob) {
      throw new FolnaroError("protocol", "documents_pdf returned no PDF.", { tool: "documents_pdf" });
    }
    return { meta: data, bytes: Buffer.from(blob, "base64") };
  }

  async createDraft(input: CreateDraftInput): Promise<DocumentDetail> {
    const { data } = await this.client.callTool<{ document: DocumentDetail }>("documents_create_draft", { ...input });
    return data.document;
  }

  async runningTimer(): Promise<TimeEntry | null> {
    const { data } = await this.client.callTool<RunningTimerResult>("time_running");
    return data.entry ?? null;
  }

  async startTimer(input: StartTimerInput): Promise<TimeEntry> {
    const { data } = await this.client.callTool<TimeEntryResult>("time_start_timer", { ...input });
    return data.entry;
  }

  async stopTimer(): Promise<TimeEntry> {
    const { data } = await this.client.callTool<TimeEntryResult>("time_stop_timer");
    return data.entry;
  }

  async timeEntries(options: { from?: string; limit?: number } = {}): Promise<TimeEntry[]> {
    const args: Record<string, unknown> = { limit: options.limit ?? 100 };
    if (options.from) args.from = options.from;
    const { data } = await this.client.callTool<TimeListResult>("time_list", args);
    return data.entries;
  }

  /**
   * Records a receipt: creates the expense in the inbox, then stores the file with it. When the
   * file is refused (a duplicate, say), the new inbox expense is deleted again so nothing half
   * done stays behind; inbox expenses may be deleted (expenses_delete).
   */
  async captureReceipt(input: CreateExpenseInput, file: { name: string; bytes: Buffer }): Promise<Expense> {
    const { data: created } = await this.client.callTool<ExpenseResult>("expenses_create", {
      ...input,
      status: "inbox",
    });
    try {
      const { data } = await this.client.callTool<ReceiptFileResult>(
        "expenses_add_receipt_file",
        { expense_id: created.expense.id, file_name: file.name, content_base64: file.bytes.toString("base64") },
        60000,
      );
      return data.expense;
    } catch (error) {
      await this.client.callTool("expenses_delete", { id: created.expense.id }).catch(() => undefined);
      throw error;
    }
  }
}
