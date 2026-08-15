import { useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";

// Query Keys
export const queryKeys = {
  brands: ["brands"] as const,
  brand: (id: string) => ["brands", id] as const,
  payments: (filters?: { status?: string; page?: number }) => ["payments", filters] as const,
  payment: (id: string) => ["payments", id] as const,
  subscriptions: (filters?: { status?: string; page?: number }) => ["subscriptions", filters] as const,
  subscription: (id: string) => ["subscriptions", id] as const,
  customers: (filters?: { email?: string; page?: number }) => ["customers", filters] as const,
  customer: (id: string) => ["customers", id] as const,
  products: (filters?: { name?: string; page?: number }) => ["products", filters] as const,
  product: (id: string) => ["products", id] as const,
  discounts: (filters?: { status?: string; page?: number }) => ["discounts", filters] as const,
  discount: (id: string) => ["discounts", id] as const,
  licenseKeys: (filters?: { status?: string; page?: number }) => ["licenseKeys", filters] as const,
  licenseKey: (id: string) => ["licenseKeys", id] as const,
  disputes: (filters?: { status?: string; page?: number }) => ["disputes", filters] as const,
  dispute: (id: string) => ["disputes", id] as const,
  refunds: (filters?: { status?: string; page?: number }) => ["refunds", filters] as const,
  refund: (id: string) => ["refunds", id] as const,
  payouts: (filters?: { limit?: number }) => ["payouts", filters] as const,
};

// Brands Queries
export function useBrands() {
  const { apiClient } = useAuth();

  return useQuery({
    queryKey: queryKeys.brands,
    queryFn: () => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.listBrands();
    },
    enabled: !!apiClient,
  });
}

export function useBrand(brandId: string) {
  const { apiClient } = useAuth();

  return useQuery({
    queryKey: queryKeys.brand(brandId),
    queryFn: () => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.getBrand(brandId);
    },
    enabled: !!apiClient && !!brandId,
  });
}

// Payments Queries
export function usePayments(
  options: {
    page?: number;
    limit?: number;
    status?: string;
  } = {},
) {
  const { apiClient } = useAuth();

  return useQuery({
    queryKey: queryKeys.payments(options),
    queryFn: () => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.listPayments(options);
    },
    enabled: !!apiClient,
  });
}

export function usePayment(paymentId: string) {
  const { apiClient } = useAuth();

  return useQuery({
    queryKey: queryKeys.payment(paymentId),
    queryFn: () => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.getPayment(paymentId);
    },
    enabled: !!apiClient && !!paymentId,
  });
}

// Infinite Payments Query
export function useInfinitePayments(
  options: {
    limit?: number;
    status?: string;
  } = {},
) {
  const { apiClient } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.payments(options),
    queryFn: ({ pageParam }) => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.listPayments({ ...options, page: pageParam });
    },
    getNextPageParam: (lastPage, pages) => (lastPage.items.length === (options.limit || 20) ? pages.length : undefined),
    initialPageParam: 0,
    enabled: !!apiClient,
  });
}

// Subscriptions Queries
export function useSubscriptions(
  options: {
    page?: number;
    limit?: number;
    status?: string;
  } = {},
) {
  const { apiClient } = useAuth();

  return useQuery({
    queryKey: queryKeys.subscriptions(options),
    queryFn: () => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.listSubscriptions(options);
    },
    enabled: !!apiClient,
  });
}

export function useSubscription(subscriptionId: string) {
  const { apiClient } = useAuth();

  return useQuery({
    queryKey: queryKeys.subscription(subscriptionId),
    queryFn: () => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.getSubscription(subscriptionId);
    },
    enabled: !!apiClient && !!subscriptionId,
  });
}

// Infinite Subscriptions Query
export function useInfiniteSubscriptions(
  options: {
    limit?: number;
    status?: string;
  } = {},
) {
  const { apiClient } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.subscriptions(options),
    queryFn: ({ pageParam }) => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.listSubscriptions({ ...options, page: pageParam });
    },
    getNextPageParam: (lastPage, pages) => (lastPage.items.length === (options.limit || 20) ? pages.length : undefined),
    initialPageParam: 0,
    enabled: !!apiClient,
  });
}

// Customers Queries
export function useCustomers(
  options: {
    page?: number;
    limit?: number;
    email?: string;
  } = {},
) {
  const { apiClient } = useAuth();

  return useQuery({
    queryKey: queryKeys.customers(options),
    queryFn: () => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.listCustomers(options);
    },
    enabled: !!apiClient,
  });
}

export function useCustomer(customerId: string) {
  const { apiClient } = useAuth();

  return useQuery({
    queryKey: queryKeys.customer(customerId),
    queryFn: () => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.getCustomer(customerId);
    },
    enabled: !!apiClient && !!customerId,
  });
}

// Infinite Customers Query
export function useInfiniteCustomers(
  options: {
    limit?: number;
    email?: string;
  } = {},
) {
  const { apiClient } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.customers(options),
    queryFn: ({ pageParam }) => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.listCustomers({ ...options, page: pageParam });
    },
    getNextPageParam: (lastPage, pages) => (lastPage.items.length === (options.limit || 20) ? pages.length : undefined),
    initialPageParam: 0,
    enabled: !!apiClient,
  });
}

// Products Queries
export function useProducts(
  options: {
    page?: number;
    limit?: number;
    name?: string;
  } = {},
) {
  const { apiClient } = useAuth();

  return useQuery({
    queryKey: queryKeys.products(options),
    queryFn: () => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.listProducts(options);
    },
    enabled: !!apiClient,
  });
}

export function useProduct(productId: string) {
  const { apiClient } = useAuth();

  return useQuery({
    queryKey: queryKeys.product(productId),
    queryFn: () => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.getProduct(productId);
    },
    enabled: !!apiClient && !!productId,
  });
}

// Infinite Products Query
export function useInfiniteProducts(
  options: {
    limit?: number;
    name?: string;
  } = {},
) {
  const { apiClient } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.products(options),
    queryFn: ({ pageParam }) => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.listProducts({ ...options, page: pageParam });
    },
    getNextPageParam: (lastPage, pages) => (lastPage.items.length === (options.limit || 50) ? pages.length : undefined),
    initialPageParam: 0,
    enabled: !!apiClient,
  });
}

// Authentication verification query using brands endpoint
export function useAuthVerification() {
  const { apiClient } = useAuth();

  return useQuery({
    queryKey: ["auth", "verification"],
    queryFn: async () => {
      if (!apiClient) throw new Error("API client not available");
      try {
        await apiClient.listBrands();
        return true; // API key is valid
      } catch (error) {
        if (error instanceof Error && error.message.includes("Invalid API key")) {
          return false; // API key is invalid
        }
        throw error; // Other errors
      }
    },
    enabled: !!apiClient,
    retry: false, // Don't retry auth failures
    staleTime: 0, // Always check auth when requested
  });
}

// Utility hook to invalidate all queries
export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries(),
    invalidateBrands: () => queryClient.invalidateQueries({ queryKey: queryKeys.brands }),
    invalidatePayments: () => queryClient.invalidateQueries({ queryKey: ["payments"] }),
    invalidateSubscriptions: () => queryClient.invalidateQueries({ queryKey: ["subscriptions"] }),
    invalidateCustomers: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
    invalidateProducts: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
    invalidateDiscounts: () => queryClient.invalidateQueries({ queryKey: ["discounts"] }),
    invalidateLicenseKeys: () => queryClient.invalidateQueries({ queryKey: ["licenseKeys"] }),
    invalidateDisputes: () => queryClient.invalidateQueries({ queryKey: ["disputes"] }),
    invalidateRefunds: () => queryClient.invalidateQueries({ queryKey: ["refunds"] }),
    invalidatePayouts: () => queryClient.invalidateQueries({ queryKey: ["payouts"] }),
  };
}

// Discounts Queries
export function useDiscounts(
  options: {
    page?: number;
    limit?: number;
    status?: string;
  } = {},
) {
  const { apiClient } = useAuth();

  return useQuery({
    queryKey: queryKeys.discounts(options),
    queryFn: () => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.listDiscounts(options);
    },
    enabled: !!apiClient,
  });
}

export function useDiscount(discountId: string) {
  const { apiClient } = useAuth();

  return useQuery({
    queryKey: queryKeys.discount(discountId),
    queryFn: () => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.getDiscount(discountId);
    },
    enabled: !!apiClient && !!discountId,
  });
}

export function useInfiniteDiscounts(
  options: {
    limit?: number;
    status?: string;
  } = {},
) {
  const { apiClient } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.discounts(options),
    queryFn: ({ pageParam = 0 }) => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.listDiscounts({
        ...options,
        page: pageParam,
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.items.length < (options.limit || 20)) {
        return undefined;
      }
      return allPages.length;
    },
    initialPageParam: 0,
    enabled: !!apiClient,
  });
}

// License Keys Queries
export function useLicenseKeys(
  options: {
    page?: number;
    limit?: number;
    status?: string;
  } = {},
) {
  const { apiClient } = useAuth();

  return useQuery({
    queryKey: queryKeys.licenseKeys(options),
    queryFn: () => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.listLicenseKeys(options);
    },
    enabled: !!apiClient,
  });
}

export function useLicenseKey(licenseKeyId: string) {
  const { apiClient } = useAuth();

  return useQuery({
    queryKey: queryKeys.licenseKey(licenseKeyId),
    queryFn: () => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.getLicenseKey(licenseKeyId);
    },
    enabled: !!apiClient && !!licenseKeyId,
  });
}

export function useInfiniteLicenseKeys(
  options: {
    limit?: number;
    status?: string;
  } = {},
) {
  const { apiClient } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.licenseKeys(options),
    queryFn: ({ pageParam = 0 }) => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.listLicenseKeys({
        ...options,
        page: pageParam,
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.items.length < (options.limit || 20)) {
        return undefined;
      }
      return allPages.length;
    },
    initialPageParam: 0,
    enabled: !!apiClient,
  });
}

// Disputes Queries
export function useDisputes(
  options: {
    page?: number;
    limit?: number;
    status?: string;
  } = {},
) {
  const { apiClient } = useAuth();

  return useQuery({
    queryKey: queryKeys.disputes(options),
    queryFn: () => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.listDisputes(options);
    },
    enabled: !!apiClient,
  });
}

export function useDispute(disputeId: string) {
  const { apiClient } = useAuth();

  return useQuery({
    queryKey: queryKeys.dispute(disputeId),
    queryFn: () => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.getDispute(disputeId);
    },
    enabled: !!apiClient && !!disputeId,
  });
}

export function useInfiniteDisputes(
  options: {
    limit?: number;
    status?: string;
  } = {},
) {
  const { apiClient } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.disputes(options),
    queryFn: ({ pageParam = 0 }) => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.listDisputes({
        ...options,
        page: pageParam,
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.items.length < (options.limit || 20)) {
        return undefined;
      }
      return allPages.length;
    },
    initialPageParam: 0,
    enabled: !!apiClient,
  });
}

// Refunds Queries
export function useRefunds(
  options: {
    page?: number;
    limit?: number;
    status?: string;
  } = {},
) {
  const { apiClient } = useAuth();

  return useQuery({
    queryKey: queryKeys.refunds(options),
    queryFn: () => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.listRefunds(options);
    },
    enabled: !!apiClient,
  });
}

export function useRefund(refundId: string) {
  const { apiClient } = useAuth();

  return useQuery({
    queryKey: queryKeys.refund(refundId),
    queryFn: () => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.getRefund(refundId);
    },
    enabled: !!apiClient && !!refundId,
  });
}

export function useInfiniteRefunds(
  options: {
    limit?: number;
    status?: string;
  } = {},
) {
  const { apiClient } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.refunds(options),
    queryFn: ({ pageParam = 0 }) => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.listRefunds({
        ...options,
        page: pageParam,
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.items.length < (options.limit || 20)) {
        return undefined;
      }
      return allPages.length;
    },
    initialPageParam: 0,
    enabled: !!apiClient,
  });
}

// Payouts Queries
export function usePayouts(
  options: {
    page?: number;
    limit?: number;
  } = {},
) {
  const { apiClient } = useAuth();

  return useQuery({
    queryKey: queryKeys.payouts(options),
    queryFn: () => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.listPayouts(options);
    },
    enabled: !!apiClient,
  });
}

export function useInfinitePayouts(
  options: {
    limit?: number;
  } = {},
) {
  const { apiClient } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.payouts(options),
    queryFn: ({ pageParam = 0 }) => {
      if (!apiClient) throw new Error("API client not available");
      return apiClient.listPayouts({
        ...options,
        page: pageParam,
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.items.length < (options.limit || 20)) {
        return undefined;
      }
      return allPages.length;
    },
    initialPageParam: 0,
    enabled: !!apiClient,
  });
}
