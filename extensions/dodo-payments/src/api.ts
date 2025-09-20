import DodoPayments from "dodopayments";
import { AuthConfig } from "./utils/auth";
import type {
  Brand,
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
  Dispute,
  Refund,
  PayoutListResponse,
} from "dodopayments/resources";
import type { DefaultPageNumberPaginationResponse } from "dodopayments/pagination";

// Re-export types for convenience
export {
  Brand,
  Payment,
  Subscription,
  Customer,
  Product,
  ProductListResponse,
  Discount,
  LicenseKey,
  DisputeListResponse,
  Dispute,
  Refund,
  PayoutListResponse,
};

// Pagination response types
export type PaymentsPaginatedResponse = DefaultPageNumberPaginationResponse<PaymentListResponse>;
export type SubscriptionsPaginatedResponse = DefaultPageNumberPaginationResponse<SubscriptionListResponse>;
export type BrandsPaginatedResponse = DefaultPageNumberPaginationResponse<Brand>;
export type ProductsPaginatedResponse = DefaultPageNumberPaginationResponse<ProductListResponse>;
export type DiscountsPaginatedResponse = DefaultPageNumberPaginationResponse<Discount>;
export type LicenseKeysPaginatedResponse = DefaultPageNumberPaginationResponse<LicenseKey>;
export type DisputesPaginatedResponse = DefaultPageNumberPaginationResponse<DisputeListResponse>;
export type RefundsPaginatedResponse = DefaultPageNumberPaginationResponse<Refund>;
export type PayoutsPaginatedResponse = DefaultPageNumberPaginationResponse<PayoutListResponse>;

// API Client Wrapper for Dodo Payments SDK
export class DodoPaymentsAPI {
  private client: DodoPayments;
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
    this.client = new DodoPayments({
      bearerToken: config.apiKey,
      environment: config.mode === "live" ? "live_mode" : "test_mode",
    });
  }

  private handleError(error: unknown): never {
    if (error instanceof DodoPayments.APIError) {
      if (error.status === 401) {
        throw new Error("Invalid API key. Please check your authentication settings.");
      }
      throw new Error(error.message || `API request failed: ${error.status}`);
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("An unexpected error occurred");
  }

  // Brands API
  async listBrands(): Promise<BrandsPaginatedResponse> {
    try {
      const response = await this.client.brands.list();
      return response as BrandsPaginatedResponse;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getBrand(brandId: string): Promise<Brand> {
    try {
      return await this.client.brands.retrieve(brandId);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Payments API
  async listPayments(
    options: { page?: number; limit?: number; status?: string } = {},
  ): Promise<PaymentsPaginatedResponse> {
    try {
      const params: Record<string, unknown> = {};
      if (options.page) params.page_number = options.page;
      if (options.limit) params.page_size = options.limit;
      if (options.status) params.status = options.status;

      const response = await this.client.payments.list(params);
      return response as PaymentsPaginatedResponse;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getPayment(paymentId: string): Promise<Payment> {
    try {
      return await this.client.payments.retrieve(paymentId);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Subscriptions API
  async listSubscriptions(
    options: { page?: number; limit?: number; status?: string } = {},
  ): Promise<SubscriptionsPaginatedResponse> {
    try {
      const params: Record<string, unknown> = {};
      if (options.page) params.page_number = options.page;
      if (options.limit) params.page_size = options.limit;
      if (options.status) params.status = options.status;

      const response = await this.client.subscriptions.list(params);
      return response as SubscriptionsPaginatedResponse;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      return await this.client.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Customers API
  async listCustomers(
    options: { page?: number; limit?: number; email?: string } = {},
  ): Promise<DefaultPageNumberPaginationResponse<Customer>> {
    try {
      const params: Record<string, unknown> = {};
      if (options.page) params.page_number = options.page;
      if (options.limit) params.page_size = options.limit;
      if (options.email) params.email = options.email;

      const response = await this.client.customers.list(params);
      return response as DefaultPageNumberPaginationResponse<Customer>;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getCustomer(customerId: string): Promise<Customer> {
    try {
      return await this.client.customers.retrieve(customerId);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Products API
  async listProducts(
    options: { page?: number; limit?: number; name?: string } = {},
  ): Promise<ProductsPaginatedResponse> {
    try {
      const params: Record<string, unknown> = {};
      if (options.page) params.page_number = options.page;
      if (options.limit) params.page_size = options.limit;
      if (options.name) params.name = options.name;

      const response = await this.client.products.list(params);
      return response as ProductsPaginatedResponse;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getProduct(productId: string): Promise<Product> {
    try {
      return await this.client.products.retrieve(productId);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Discounts API
  async listDiscounts(
    options: { page?: number; limit?: number; status?: string } = {},
  ): Promise<DiscountsPaginatedResponse> {
    try {
      const params: Record<string, unknown> = {};
      if (options.page) params.page_number = options.page;
      if (options.limit) params.page_size = options.limit;
      if (options.status) params.status = options.status;

      const response = await this.client.discounts.list(params);
      return response as DiscountsPaginatedResponse;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getDiscount(discountId: string): Promise<Discount> {
    try {
      return await this.client.discounts.retrieve(discountId);
    } catch (error) {
      this.handleError(error);
    }
  }

  // License Keys API
  async listLicenseKeys(
    options: { page?: number; limit?: number; status?: string } = {},
  ): Promise<LicenseKeysPaginatedResponse> {
    try {
      const params: Record<string, unknown> = {};
      if (options.page) params.page_number = options.page;
      if (options.limit) params.page_size = options.limit;
      if (options.status) params.status = options.status;

      const response = await this.client.licenseKeys.list(params);
      return response as LicenseKeysPaginatedResponse;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getLicenseKey(licenseKeyId: string): Promise<LicenseKey> {
    try {
      return await this.client.licenseKeys.retrieve(licenseKeyId);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Disputes API
  async listDisputes(
    options: { page?: number; limit?: number; status?: string } = {},
  ): Promise<DisputesPaginatedResponse> {
    try {
      const params: Record<string, unknown> = {};
      if (options.page) params.page_number = options.page;
      if (options.limit) params.page_size = options.limit;
      if (options.status) params.status = options.status;

      const response = await this.client.disputes.list(params);
      return response as DisputesPaginatedResponse;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getDispute(disputeId: string): Promise<Dispute> {
    try {
      return await this.client.disputes.retrieve(disputeId);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Refunds API
  async listRefunds(
    options: { page?: number; limit?: number; status?: string } = {},
  ): Promise<RefundsPaginatedResponse> {
    try {
      const params: Record<string, unknown> = {};
      if (options.page) params.page_number = options.page;
      if (options.limit) params.page_size = options.limit;
      if (options.status) params.status = options.status;

      const response = await this.client.refunds.list(params);
      return response as RefundsPaginatedResponse;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getRefund(refundId: string): Promise<Refund> {
    try {
      return await this.client.refunds.retrieve(refundId);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Payouts API
  async listPayouts(options: { page?: number; limit?: number } = {}): Promise<PayoutsPaginatedResponse> {
    try {
      const params: Record<string, unknown> = {};
      if (options.page) params.page_number = options.page;
      if (options.limit) params.page_size = options.limit;

      const response = await this.client.payouts.list(params);
      return response as PayoutsPaginatedResponse;
    } catch (error) {
      this.handleError(error);
    }
  }
}

// Utility function to create API client from auth config
export function createAPIClient(config: AuthConfig): DodoPaymentsAPI {
  return new DodoPaymentsAPI(config);
}

// Export DodoPayments for error handling
export { DodoPayments };
