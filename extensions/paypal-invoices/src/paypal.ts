import { getPreferenceValues } from "@raycast/api";

interface AccessTokenCache {
  token: string;
  expiresAt: number;
  baseUrl: string;
}

interface PayPalLink {
  rel: string;
  href: string;
}

interface PayPalTokenResponse {
  access_token: string;
  expires_in: number;
}

interface PayPalInvoiceResponse {
  href?: string;
  links?: PayPalLink[];
  status?: string;
  detail?: {
    metadata?: {
      invoicer_view_url?: string;
    };
    payment_term?: Record<string, string>;
    currency_code?: string;
    note?: string;
  };
  primary_recipients?: unknown[];
  items?: unknown[];
  configuration?: unknown;
}

let tokenCache: AccessTokenCache | null = null;

export const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function getBaseUrl(): string {
  const { sandboxMode } = getPreferenceValues<ExtensionPreferences>();
  return sandboxMode
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  const base = getBaseUrl();

  if (
    tokenCache &&
    tokenCache.expiresAt > now + 60_000 &&
    tokenCache.baseUrl === base
  ) {
    return tokenCache.token;
  }

  const { clientId, clientSecret } =
    getPreferenceValues<ExtensionPreferences>();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const response = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal auth failed: ${error}`);
  }

  const data = (await response.json()) as PayPalTokenResponse;
  tokenCache = {
    token: data.access_token as string,
    expiresAt: now + (data.expires_in as number) * 1000,
    baseUrl: base,
  };

  return tokenCache.token;
}

export interface CreateInvoiceParams {
  recipientName: string;
  recipientEmail?: string;
  currency: string;
  note?: string;
  dueDate?: string;
  taxPercent?: number;
  taxName?: string;
  allowTip?: boolean;
  allowPartialPayment?: boolean;
  items: Array<{
    name: string;
    description?: string;
    quantity: string;
    price: string;
  }>;
}

export interface UpdateInvoiceParams {
  invoiceId: string;
  recipientName: string;
  recipientEmail?: string;
  currency: string;
  note?: string;
  dueDate?: string;
  taxPercent?: number;
  taxName?: string;
  allowTip?: boolean;
  allowPartialPayment?: boolean;
  notifyRecipient?: boolean;
  items: Array<{
    name: string;
    description?: string;
    quantity: string;
    price: string;
  }>;
}

function buildInvoiceBody(params: CreateInvoiceParams, currency: string) {
  const nameParts = params.recipientName.trim().split(" ");
  const givenName = nameParts[0];
  const surname = nameParts.slice(1).join(" ") || undefined;

  const billingInfo: Record<string, unknown> = {
    name: {
      given_name: givenName,
      ...(surname && { surname }),
    },
  };

  if (params.recipientEmail && isValidEmail(params.recipientEmail)) {
    billingInfo.email_address = params.recipientEmail;
  }

  return {
    detail: {
      currency_code: currency,
      ...(params.note && { note: params.note }),
      ...(params.dueDate && {
        payment_term: {
          term_type: "DUE_ON_DATE_SPECIFIED",
          due_date: params.dueDate,
        },
      }),
    },
    primary_recipients: [{ billing_info: billingInfo }],
    items: params.items.map((item) => ({
      name: item.name,
      ...(item.description && { description: item.description }),
      quantity: item.quantity,
      unit_amount: {
        currency_code: currency,
        value: parseFloat(item.price).toFixed(2),
      },
      ...(params.taxPercent && {
        tax: {
          name: params.taxName?.trim() || "Tax",
          percent: String(params.taxPercent),
        },
      }),
    })),
    configuration: {
      allow_tip: params.allowTip ?? false,
      partial_payment: {
        allow_partial_payment: params.allowPartialPayment ?? false,
      },
    },
  };
}

export async function createDraftInvoice(params: CreateInvoiceParams): Promise<{
  invoiceId: string;
  invoicerViewUrl: string;
}> {
  const token = await getAccessToken();
  const body = buildInvoiceBody(params, params.currency);

  const response = await fetch(`${getBaseUrl()}/v2/invoicing/invoices`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create invoice: ${error}`);
  }

  const data = (await response.json()) as PayPalInvoiceResponse;
  const selfLink: string =
    data.href ?? data.links?.find((l) => l.rel === "self")?.href ?? "";
  const invoiceId = selfLink.split("/").pop() ?? "";
  if (!invoiceId) {
    throw new Error("PayPal did not return a valid invoice ID.");
  }

  const detailResponse = await fetch(
    `${getBaseUrl()}/v2/invoicing/invoices/${invoiceId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!detailResponse.ok) {
    return {
      invoiceId,
      invoicerViewUrl: `https://www.paypal.com/invoice/details/${invoiceId}`,
    };
  }

  const detail = (await detailResponse.json()) as PayPalInvoiceResponse;
  const invoicerViewUrl: string =
    detail.detail?.metadata?.invoicer_view_url ??
    `https://www.paypal.com/invoice/details/${invoiceId}`;

  return { invoiceId, invoicerViewUrl };
}

export async function updateInvoice(
  params: UpdateInvoiceParams,
): Promise<void> {
  const token = await getAccessToken();
  const body = buildInvoiceBody(params, params.currency);

  const notifyRecipient = params.notifyRecipient ?? false;
  const url = `${getBaseUrl()}/v2/invoicing/invoices/${params.invoiceId}?send_to_recipient=${notifyRecipient}&send_to_invoicer=false`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update invoice: ${error}`);
  }
}

export async function updateDueDate(
  invoiceId: string,
  dueDate: string | null,
): Promise<void> {
  const token = await getAccessToken();

  const current = await getFullInvoice(invoiceId);

  const body = {
    detail: Object.assign({}, current.detail as Record<string, unknown>, {
      payment_term: dueDate
        ? { term_type: "DUE_ON_DATE_SPECIFIED", due_date: dueDate }
        : { term_type: "DUE_ON_RECEIPT" },
    }),
    primary_recipients: current.primary_recipients,
    items: current.items,
    configuration: current.configuration,
  };

  const response = await fetch(
    `${getBaseUrl()}/v2/invoicing/invoices/${invoiceId}?send_to_recipient=false&send_to_invoicer=false`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update due date: ${error}`);
  }
}

export async function getFullInvoice(
  invoiceId: string,
): Promise<PayPalInvoiceResponse> {
  const token = await getAccessToken();

  const response = await fetch(
    `${getBaseUrl()}/v2/invoicing/invoices/${invoiceId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch invoice: ${await response.text()}`);
  }

  return (await response.json()) as PayPalInvoiceResponse;
}

export async function sendInvoice(
  invoiceId: string,
  sendToRecipient: boolean,
): Promise<string> {
  const token = await getAccessToken();

  const response = await fetch(
    `${getBaseUrl()}/v2/invoicing/invoices/${invoiceId}/send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        send_to_invoicer: false,
        send_to_recipient: sendToRecipient,
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send invoice: ${error}`);
  }

  const data = (await response.json()) as PayPalInvoiceResponse;
  const payerViewUrl: string =
    data.href ?? data.links?.find((l) => l.rel === "payer-view")?.href ?? "";
  if (!payerViewUrl) {
    throw new Error("PayPal did not return a payment link for this invoice.");
  }

  return payerViewUrl;
}

export async function getInvoiceStatus(
  invoiceId: string,
): Promise<{ status: string; invoicerViewUrl: string }> {
  const token = await getAccessToken();

  const response = await fetch(
    `${getBaseUrl()}/v2/invoicing/invoices/${invoiceId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch invoice: ${await response.text()}`);
  }

  const data = (await response.json()) as PayPalInvoiceResponse;
  const status = (data.status as string) ?? "DRAFT";
  const invoicerViewUrl: string =
    data.detail?.metadata?.invoicer_view_url ??
    `https://www.paypal.com/invoice/details/${invoiceId}`;

  return { status, invoicerViewUrl };
}

export async function cancelInvoice(invoiceId: string): Promise<void> {
  const token = await getAccessToken();

  const response = await fetch(
    `${getBaseUrl()}/v2/invoicing/invoices/${invoiceId}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        send_to_invoicer: false,
        send_to_recipient: false,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to cancel invoice: ${await response.text()}`);
  }
}
