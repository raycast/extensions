import { AuthConfig } from "./utils/auth";
import type {
  BrandRetrieveResponse,
  Payment,
  PaymentListResponse,
  Subscription,
  SubscriptionListResponse,
  Customer,
  Product,
  ProductListResponse,
  Discount,
  LicenseKey,
  DisputeListResponse,
  DisputeRetrieveResponse,
  Refund,
  PayoutListResponse,
} from "dodopayments/resources";
import type { DefaultPageNumberPaginationResponse } from "dodopayments/pagination";

// Re-export types for convenience
export type Brand = BrandRetrieveResponse;
export {
  Payment,
  Subscription,
  Customer,
  Product,
  ProductListResponse,
  Discount,
  LicenseKey,
  DisputeListResponse,
  DisputeRetrieveResponse,
  Refund,
  PayoutListResponse,
};

// Pagination response types
export type PaymentsPaginatedResponse = DefaultPageNumberPaginationResponse<PaymentListResponse>;
export type SubscriptionsPaginatedResponse = DefaultPageNumberPaginationResponse<SubscriptionListResponse>;
export type BrandsPaginatedResponse = DefaultPageNumberPaginationResponse<BrandRetrieveResponse>;
export type ProductsPaginatedResponse = DefaultPageNumberPaginationResponse<ProductListResponse>;
export type DiscountsPaginatedResponse = DefaultPageNumberPaginationResponse<Discount>;
export type LicenseKeysPaginatedResponse = DefaultPageNumberPaginationResponse<LicenseKey>;
export type DisputesPaginatedResponse = DefaultPageNumberPaginationResponse<DisputeListResponse>;
export type RefundsPaginatedResponse = DefaultPageNumberPaginationResponse<Refund>;
export type PayoutsPaginatedResponse = DefaultPageNumberPaginationResponse<PayoutListResponse>;

export interface ApiError {
  error: {
    type: string;
    message: string;
    code?: string;
  };
}

// API Client Class
export class DodoPaymentsAPI {
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid API key. Please check your authentication settings.");
      }

      let errorMessage = `API request failed: ${response.status} ${response.statusText}`;

      try {
        const errorData = (await response.json()) as ApiError;
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // If we can't parse the error response, use the default message
      }

      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  }

  // Brands API
  async listBrands(options: { page?: number; limit?: number } = {}): Promise<BrandsPaginatedResponse> {
    const params = new URLSearchParams({
      page_number: (options.page || 0).toString(),
      page_size: (options.limit || 20).toString(),
    });

    return this.makeRequest<BrandsPaginatedResponse>(`/brands?${params.toString()}`);
  }

  async getBrand(brandId: string): Promise<Brand> {
    return this.makeRequest<Brand>(`/brands/${brandId}`);
  }

  // Payments API
  async listPayments(
    options: { page?: number; limit?: number; status?: string } = {},
  ): Promise<PaymentsPaginatedResponse> {
    const params = new URLSearchParams({
      page_number: (options.page || 0).toString(),
      page_size: (options.limit || 20).toString(),
    });

    if (options.status) {
      params.append("status", options.status);
    }

    return this.makeRequest<PaymentsPaginatedResponse>(`/payments?${params.toString()}`);
  }

  async getPayment(paymentId: string): Promise<Payment> {
    return this.makeRequest<Payment>(`/payments/${paymentId}`);
  }

  // Subscriptions API
  async listSubscriptions(
    options: { page?: number; limit?: number; status?: string } = {},
  ): Promise<SubscriptionsPaginatedResponse> {
    const params = new URLSearchParams({
      page_number: (options.page || 0).toString(),
      page_size: (options.limit || 20).toString(),
    });

    if (options.status) {
      params.append("status", options.status);
    }

    return this.makeRequest<SubscriptionsPaginatedResponse>(`/subscriptions?${params.toString()}`);
  }

  async getSubscription(subscriptionId: string): Promise<Subscription> {
    return this.makeRequest<Subscription>(`/subscriptions/${subscriptionId}`);
  }

  // Customers API
  async listCustomers(
    options: { page?: number; limit?: number; email?: string } = {},
  ): Promise<DefaultPageNumberPaginationResponse<Customer>> {
    const params = new URLSearchParams({
      page_number: (options.page || 0).toString(),
      page_size: (options.limit || 20).toString(),
    });

    if (options.email) {
      params.append("email", options.email);
    }

    return this.makeRequest<DefaultPageNumberPaginationResponse<Customer>>(`/customers?${params.toString()}`);
  }

  async getCustomer(customerId: string): Promise<Customer> {
    return this.makeRequest<Customer>(`/customers/${customerId}`);
  }

  // Products API
  async listProducts(
    options: { page?: number; limit?: number; name?: string } = {},
  ): Promise<ProductsPaginatedResponse> {
    const params = new URLSearchParams({
      page_number: (options.page || 0).toString(),
      page_size: (options.limit || 20).toString(),
    });

    if (options.name) {
      params.append("name", options.name);
    }

    return this.makeRequest<ProductsPaginatedResponse>(`/products?${params.toString()}`);
  }

  async getProduct(productId: string): Promise<Product> {
    return this.makeRequest<Product>(`/products/${productId}`);
  }

  // Discounts API
  async listDiscounts(
    options: { page?: number; limit?: number; status?: string } = {},
  ): Promise<DiscountsPaginatedResponse> {
    const params = new URLSearchParams({
      page_number: (options.page || 0).toString(),
      page_size: (options.limit || 20).toString(),
    });

    if (options.status) {
      params.append("status", options.status);
    }

    return this.makeRequest<DiscountsPaginatedResponse>(`/discounts?${params.toString()}`);
  }

  async getDiscount(discountId: string): Promise<Discount> {
    return this.makeRequest<Discount>(`/discounts/${discountId}`);
  }

  // License Keys API
  async listLicenseKeys(
    options: { page?: number; limit?: number; status?: string } = {},
  ): Promise<LicenseKeysPaginatedResponse> {
    const params = new URLSearchParams({
      page_number: (options.page || 0).toString(),
      page_size: (options.limit || 20).toString(),
    });

    if (options.status) {
      params.append("status", options.status);
    }

    return this.makeRequest<LicenseKeysPaginatedResponse>(`/license_keys?${params.toString()}`);
  }

  async getLicenseKey(licenseKeyId: string): Promise<LicenseKey> {
    return this.makeRequest<LicenseKey>(`/license_keys/${licenseKeyId}`);
  }

  // Disputes API
  async listDisputes(
    options: { page?: number; limit?: number; status?: string } = {},
  ): Promise<DisputesPaginatedResponse> {
    const params = new URLSearchParams({
      page_number: (options.page || 0).toString(),
      page_size: (options.limit || 20).toString(),
    });

    if (options.status) {
      params.append("status", options.status);
    }

    return this.makeRequest<DisputesPaginatedResponse>(`/disputes?${params.toString()}`);
  }

  async getDispute(disputeId: string): Promise<DisputeRetrieveResponse> {
    return this.makeRequest<DisputeRetrieveResponse>(`/disputes/${disputeId}`);
  }

  // Refunds API
  async listRefunds(
    options: { page?: number; limit?: number; status?: string } = {},
  ): Promise<RefundsPaginatedResponse> {
    const params = new URLSearchParams({
      page_number: (options.page || 0).toString(),
      page_size: (options.limit || 20).toString(),
    });

    if (options.status) {
      params.append("status", options.status);
    }

    return this.makeRequest<RefundsPaginatedResponse>(`/refunds?${params.toString()}`);
  }

  async getRefund(refundId: string): Promise<Refund> {
    return this.makeRequest<Refund>(`/refunds/${refundId}`);
  }

  // Payouts API
  async listPayouts(options: { page?: number; limit?: number } = {}): Promise<PayoutsPaginatedResponse> {
    const params = new URLSearchParams({
      page_number: (options.page || 0).toString(),
      page_size: (options.limit || 20).toString(),
    });

    return this.makeRequest<PayoutsPaginatedResponse>(`/payouts?${params.toString()}`);
  }
}

// Utility function to create API client from auth config
export function createAPIClient(config: AuthConfig): DodoPaymentsAPI {
  return new DodoPaymentsAPI(config);
}
