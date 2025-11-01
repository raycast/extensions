import { showFailureToast } from "@raycast/utils";
import {
  Folder,
  Transaction,
  ApiResponse,
  TransactionRequest,
  TransactionListRequest,
  TransactionUpdateRequest,
  ProcessedTransaction,
  ShareRequest,
  ShareLink,
  ERROR_MESSAGES,
} from "./types";
import { API_ENDPOINTS, CONFIG } from "./config";
import { logger, PerformanceLogger } from "./logger";

export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function makeApiRequest<T>(url: string, token: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const perfLogger = new PerformanceLogger(`API Request: ${options.method || "GET"} ${url}`);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);

  try {
    logger.apiRequest(
      options.method || "GET",
      url,
      options.body
        ? (() => {
            try {
              return JSON.parse(options.body as string);
            } catch {
              return options.body;
            }
          })()
        : undefined,
    );

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
      signal: controller.signal,
      ...options,
    });

    logger.apiResponse(url, response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      logger.apiError(url, `HTTP ${response.status}: ${errorText}`);
      throw new ApiError(`HTTP ${response.status}: ${errorText}`, "HTTP_ERROR", response.status);
    }

    const data = (await response.json()) as ApiResponse<T>;
    logger.apiResponse(url, response.status, data);
    perfLogger.finish("Success");
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      perfLogger.finish("API Error");
      throw error;
    }

    logger.apiError(url, error);
    perfLogger.finish("Network Error");
    throw new ApiError(error instanceof Error ? error.message : "Network request failed", "NETWORK_ERROR");
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchFolders(token: string): Promise<Folder[]> {
  try {
    const response = await fetch(API_ENDPOINTS.GET_FOLDERS, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new ApiError(`HTTP ${response.status}: ${errorText}`, "HTTP_ERROR", response.status);
    }

    const data: unknown = await response.json();

    // Type guard functions
    const isArrayOfFolders = (value: unknown): value is Folder[] => {
      return (
        Array.isArray(value) &&
        value.every(
          (item) => item && typeof item === "object" && "key" in item && "label" in item && "currency" in item,
        )
      );
    };

    const isWrappedResponse = (value: unknown): value is { success?: boolean; data?: unknown; error?: string } => {
      return value !== null && typeof value === "object";
    };

    // Handle both response formats: direct array or wrapped in success object
    let folders: Folder[];

    if (isArrayOfFolders(data)) {
      folders = data;
    } else if (isWrappedResponse(data)) {
      const wrappedData = data as { success?: boolean; data?: unknown; error?: string };

      if (wrappedData.success && isArrayOfFolders(wrappedData.data)) {
        folders = wrappedData.data;
      } else if (isArrayOfFolders(wrappedData.data)) {
        folders = wrappedData.data;
      } else {
        const errorMessage =
          typeof wrappedData.error === "string" ? wrappedData.error : ERROR_MESSAGES.FOLDER_LOAD_ERROR;
        throw new ApiError(errorMessage, "FOLDER_ERROR");
      }
    } else {
      throw new ApiError(ERROR_MESSAGES.FOLDER_LOAD_ERROR, "FOLDER_ERROR");
    }

    // Validate folder structure
    const validFolders = folders.filter(
      (folder): folder is Folder =>
        folder &&
        typeof folder.key === "string" &&
        typeof folder.label === "string" &&
        typeof folder.currency === "string",
    );

    if (validFolders.length === 0) {
      throw new ApiError("No valid folders found", "NO_FOLDERS");
    }

    return validFolders;
  } catch (error) {
    if (error instanceof ApiError) {
      await showFailureToast(error.message);
      throw error;
    }

    logger.error("API request failed", error);
    const apiError = new ApiError(error instanceof Error ? error.message : "Network request failed", "NETWORK_ERROR");

    await showFailureToast(apiError.message);

    throw apiError;
  }
}

export async function addTransaction(token: string, request: TransactionRequest): Promise<ProcessedTransaction> {
  try {
    if (!request.transcript?.trim()) {
      throw new ApiError(ERROR_MESSAGES.EMPTY_INPUT, "EMPTY_INPUT");
    }

    if (!request.folder_id?.trim()) {
      throw new ApiError("Folder selection required", "NO_FOLDER");
    }

    const response = await makeApiRequest<ProcessedTransaction>(API_ENDPOINTS.ADD_TRANSACTION, token, {
      method: "POST",
      body: JSON.stringify(request),
    });

    if (!response.success || !response.data) {
      throw new ApiError(response.error || ERROR_MESSAGES.TRANSACTION_ADD_ERROR, "TRANSACTION_ERROR");
    }

    return response.data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error("Failed to add transaction", error);
    throw new ApiError(ERROR_MESSAGES.TRANSACTION_ADD_ERROR, "ADD_TRANSACTION_ERROR");
  }
}

export async function fetchTransactions(token: string, request: TransactionListRequest): Promise<Transaction[]> {
  try {
    const response = await makeApiRequest<Transaction[]>(API_ENDPOINTS.GET_TRANSACTIONS, token, {
      method: "POST",
      body: JSON.stringify(request),
    });

    if (!response.success) {
      throw new ApiError(response.error || ERROR_MESSAGES.TRANSACTION_LOAD_ERROR, "TRANSACTION_LOAD_ERROR");
    }

    // Return empty array if no data (not an error)
    return response.data || [];
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error("Failed to fetch transactions", error);
    throw new ApiError(ERROR_MESSAGES.TRANSACTION_LOAD_ERROR, "FETCH_TRANSACTION_ERROR");
  }
}

export async function fetchMonthTransactions(
  token: string,
  folderId: string,
  month: number,
  year: number,
): Promise<Transaction[]> {
  try {
    const [expensesResponse, incomeResponse] = await Promise.allSettled([
      fetchTransactions(token, {
        folder_id: folderId,
        month,
        year,
        type: "Expense",
        limit: CONFIG.DEFAULT_TRANSACTION_LIMIT,
      }),
      fetchTransactions(token, {
        folder_id: folderId,
        month,
        year,
        type: "Income",
        limit: CONFIG.DEFAULT_TRANSACTION_LIMIT,
      }),
    ]);

    const expenses = expensesResponse.status === "fulfilled" ? expensesResponse.value : [];
    const income = incomeResponse.status === "fulfilled" ? incomeResponse.value : [];

    // Log any errors but don't fail completely
    if (expensesResponse.status === "rejected") {
      logger.error("Failed to load expenses", expensesResponse.reason);
    }
    if (incomeResponse.status === "rejected") {
      logger.error("Failed to load income", incomeResponse.reason);
    }

    const allTransactions = [...expenses, ...income];

    // Sort by planned_date descending
    return allTransactions.sort((a, b) => new Date(b.planned_date).getTime() - new Date(a.planned_date).getTime());
  } catch (error) {
    logger.error("Failed to fetch month transactions", error);
    throw new ApiError(ERROR_MESSAGES.TRANSACTION_LOAD_ERROR, "FETCH_MONTH_ERROR");
  }
}

export async function updateTransaction(
  token: string,
  request: TransactionUpdateRequest,
): Promise<{ is_paid?: boolean }> {
  try {
    if (!request.transaction_id?.trim()) {
      throw new ApiError("Transaction ID required", "NO_TRANSACTION_ID");
    }

    if (!["toggle", "delete"].includes(request.action)) {
      throw new ApiError("Invalid action", "INVALID_ACTION");
    }

    const response = await makeApiRequest<{ is_paid: boolean }>(API_ENDPOINTS.UPDATE_TRANSACTION, token, {
      method: "POST",
      body: JSON.stringify(request),
    });

    if (!response.success) {
      throw new ApiError(response.error || ERROR_MESSAGES.TRANSACTION_UPDATE_ERROR, "UPDATE_ERROR");
    }

    return response.data || {};
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error("Failed to update transaction", error);
    throw new ApiError(ERROR_MESSAGES.TRANSACTION_UPDATE_ERROR, "UPDATE_TRANSACTION_ERROR");
  }
}

// Utility function to validate API responses
export function validateApiResponse<T>(response: unknown): ApiResponse<T> {
  if (!response || typeof response !== "object") {
    throw new ApiError("Invalid API response", "INVALID_RESPONSE");
  }

  const apiResponse = response as ApiResponse<T>;

  if (typeof apiResponse.success !== "boolean") {
    throw new ApiError("Invalid API response format", "INVALID_FORMAT");
  }

  return apiResponse;
}

export async function manageShareFolder(token: string, request: ShareRequest): Promise<ShareLink | ShareLink[]> {
  try {
    if (!request.folder_id?.trim()) {
      throw new ApiError("Folder ID required", "NO_FOLDER_ID");
    }

    if (!["create", "list", "delete"].includes(request.action)) {
      throw new ApiError("Invalid action", "INVALID_ACTION");
    }

    if (request.action === "delete" && !request.share_code?.trim()) {
      throw new ApiError("Share code required for delete action", "NO_SHARE_CODE");
    }

    const response = await makeApiRequest<ShareLink | ShareLink[]>(API_ENDPOINTS.SHARE_FOLDER, token, {
      method: "POST",
      body: JSON.stringify(request),
    });

    if (!response.success) {
      throw new ApiError(response.error || "Share operation failed", "SHARE_ERROR");
    }

    if (!response.data) {
      throw new ApiError("No data returned from share operation", "NO_DATA");
    }

    return response.data!;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error("Failed to manage share folder", error);
    throw new ApiError("Share operation failed", "SHARE_OPERATION_ERROR");
  }
}

export async function createShareLink(token: string, folderId: string): Promise<ShareLink> {
  const result = await manageShareFolder(token, {
    folder_id: folderId,
    action: "create",
  });
  if (Array.isArray(result)) {
    throw new ApiError("Expected single share link, got array", "INVALID_RESPONSE");
  }
  return result;
}

export async function getShareLinks(token: string, folderId: string): Promise<ShareLink[]> {
  const result = await manageShareFolder(token, {
    folder_id: folderId,
    action: "list",
  });
  if (!Array.isArray(result)) {
    throw new ApiError("Expected array of share links, got single object", "INVALID_RESPONSE");
  }
  return result;
}

export async function deleteShareLink(token: string, folderId: string, shareCode: string): Promise<void> {
  await manageShareFolder(token, {
    folder_id: folderId,
    action: "delete",
    share_code: shareCode,
  });
}
