type StripeListResponse<T> = {
  data: T[];
  has_more: boolean;
};

type StripeRequestOptions = {
  signal?: AbortSignal;
};

export type StripeSubscription = {
  id: string;
  status: string;
  items: {
    data: Array<{
      price: {
        unit_amount: number | null;
        currency: string;
        recurring: {
          interval: "day" | "week" | "month" | "year";
          interval_count: number;
        } | null;
      };
    }>;
  };
};

export type StripePaymentIntent = {
  id: string;
  amount: number;
  amount_received: number;
  currency: string;
  created: number;
  status: string;
};

export type StripeCustomer = {
  id: string;
  created: number;
};

export type StripeInvoice = {
  id: string;
  amount_due: number;
  currency: string;
  status: string;
  attempt_count: number;
  next_payment_attempt: number | null;
  customer_email: string | null;
  customer_name: string | null;
  hosted_invoice_url: string | null;
  customer: string | null;
  payment_intent: {
    last_payment_error?: {
      message?: string;
    } | null;
  } | null;
};

type StripeErrorResponse = {
  error?: {
    message?: string;
  };
};

type StripeQueryValue =
  | string
  | number
  | boolean
  | Array<string | number | boolean>
  | undefined;

function createQueryString(query?: Record<string, StripeQueryValue>) {
  if (!query) {
    return "";
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, String(item));
      }
      continue;
    }

    searchParams.append(key, String(value));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

async function stripeRequest<T>(
  secretKey: string,
  path: string,
  query?: Record<string, StripeQueryValue>,
  options?: StripeRequestOptions,
) {
  const response = await fetch(
    `https://api.stripe.com${path}${createQueryString(query)}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      signal: options?.signal,
    },
  );

  if (!response.ok) {
    const errorBody = (await response
      .json()
      .catch(() => ({}))) as StripeErrorResponse;
    throw new Error(errorBody.error?.message ?? "Stripe request failed");
  }

  return (await response.json()) as T;
}

async function stripeList<T extends { id: string }>(
  secretKey: string,
  path: string,
  query?: Record<string, StripeQueryValue>,
  options?: StripeRequestOptions,
) {
  const items: T[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    options?.signal?.throwIfAborted();

    const response = await stripeRequest<StripeListResponse<T>>(
      secretKey,
      path,
      {
        ...query,
        limit: 100,
        starting_after: startingAfter,
      },
      options,
    );

    items.push(...response.data);
    hasMore = response.has_more;
    startingAfter = response.data.at(-1)?.id;

    if (!startingAfter) {
      hasMore = false;
    }
  }

  return items;
}

export function listSubscriptions(
  secretKey: string,
  options?: StripeRequestOptions,
) {
  return stripeList<StripeSubscription>(
    secretKey,
    "/v1/subscriptions",
    { status: "all" },
    options,
  );
}

export function listPaymentIntents(
  secretKey: string,
  createdAt: { gte?: number; lt?: number },
  options?: StripeRequestOptions,
) {
  return stripeList<StripePaymentIntent>(
    secretKey,
    "/v1/payment_intents",
    {
      "created[gte]": createdAt.gte,
      "created[lt]": createdAt.lt,
    },
    options,
  );
}

export function listCustomers(
  secretKey: string,
  createdAt: { gte?: number; lt?: number },
  options?: StripeRequestOptions,
) {
  return stripeList<StripeCustomer>(
    secretKey,
    "/v1/customers",
    {
      "created[gte]": createdAt.gte,
      "created[lt]": createdAt.lt,
    },
    options,
  );
}

export function listOpenInvoices(
  secretKey: string,
  options?: StripeRequestOptions,
) {
  return stripeList<StripeInvoice>(
    secretKey,
    "/v1/invoices",
    {
      status: "open",
      "expand[]": ["data.payment_intent"],
    },
    options,
  );
}
