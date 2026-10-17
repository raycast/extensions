import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<{ app_api_key?: string; site_id?: string; api_key?: string }>();

const appApiUrl = "https://api.customer.io/v1/";
const pipelinesUrl = "https://api.customer.io/v1/pipelines/";

// ============================================================================
// API Request Helpers
// ============================================================================

function getAppApiHeaders(): Record<string, string> {
  if (!preferences.app_api_key) {
    throw new Error("Please set your App API Key in extension preferences");
  }
  return {
    Authorization: `Bearer ${preferences.app_api_key}`,
    "Content-Type": "application/json",
  };
}

async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${appApiUrl}${endpoint}`, {
    headers: getAppApiHeaders(),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

async function apiPost<T = void>(endpoint: string, body?: unknown): Promise<T> {
  const options: RequestInit = {
    method: "POST",
    headers: getAppApiHeaders(),
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`${appApiUrl}${endpoint}`, options);
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

// ============================================================================
// Types
// ============================================================================

export interface Customer {
  id: string;
  email: string;
  attributes: Record<string, unknown>;
  created_at: number;
  // Add more fields as needed
}

export interface Campaign {
  id: number;
  name: string;
  state: string;
  created: number;
  updated: number;
  type?: string;
  send_mode?: string;
  description?: string;
  active?: boolean;
  deduplicate_id?: string;
  first_started?: number;
  tags?: string[];
  actions?: Array<{ id: number; type?: string }>;
  trigger_segment_ids?: number[];
  filter_segment_ids?: number[];
  msg_templates?: Array<{ type: string; id: number }>;
}

export interface Broadcast {
  id: number;
  name: string;
  state: string;
  created: number;
  updated: number;
  type?: "triggered_broadcast" | "email" | "webhook" | "twilio" | "slack" | "push" | "in_app";
  active?: boolean;
  actions?: Array<{ id: number; type?: string }>;
  tags?: string[];
  first_started?: number;
  deduplicate_id?: string;
  created_by?: string;
  sent_at?: number;
  content_ids?: number[];
  recipient_segment_ids?: number[];
  subscription_topic_id?: number;
  trigger_data?: Record<string, unknown>;
  recipient_config?: Record<string, unknown>;
}

export interface MetricsSeries {
  sent?: number[];
  delivered?: number[];
  opened?: number[];
  human_opened?: number[];
  clicked?: number[];
  human_clicked?: number[];
  bounced?: number[];
  spammed?: number[];
  unsubscribed?: number[];
  converted?: number[];
  failed?: number[];
  created?: number[];
  attempted?: number[];
  deferred?: number[];
  suppressed?: number[];
  [key: string]: number[] | undefined;
}

export type MetricPeriod = "7days" | "30days" | "12weeks" | "12months";

export interface CalculatedMetrics {
  // Raw counts
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  bounced: number;
  unsubscribed: number;
  failed: number;
  spammed: number;
  suppressed: number;
  // Calculated rates (percentages)
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  conversionRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  spamRate: number;
}

export interface MetricsResponse {
  metric: {
    series: MetricsSeries;
  };
}

// ============================================================================
// Segment Types
// ============================================================================

export interface Segment {
  id: number;
  name: string;
  description?: string;
  state: "Draft" | "Available";
  type: "Data Driven" | "Manual";
  progress: number;
  created_at: number;
  updated_at: number;
  deduplicate_id?: string;
  tags?: string[];
}

export interface SegmentDependencies {
  segment_id: number;
  used_by: {
    campaigns?: number[];
    sent_newsletters?: number[];
    draft_newsletters?: number[];
  };
}

export interface SegmentUsageItem {
  id: number;
  name: string;
  state?: string;
}

export interface SegmentUsageSummary {
  campaigns: SegmentUsageItem[];
  newsletters: SegmentUsageItem[];
  campaignCount: number;
  newsletterCount: number;
}

export interface SegmentMember {
  id: string | number;
  email?: string;
  cio_id?: string;
}

// ============================================================================
// Customer Profile Types
// ============================================================================

export interface CustomerProfile {
  id: string;
  cio_id?: string;
  email?: string;
  created_at?: number;
  attributes: Record<string, unknown>;
  timestamps?: Record<string, number>;
  unsubscribed?: boolean;
}

export interface CustomerActivity {
  id: string;
  type: string;
  name?: string;
  timestamp: number;
  delivery_id?: string;
  campaign_id?: number;
  broadcast_id?: number;
}

export interface CustomerMessage {
  id: string;
  type: string;
  name?: string;
  subject?: string;
  recipient?: string;
  created?: number;
  created_at?: number;
  campaign_id?: number;
  broadcast_id?: number;
}

// ============================================================================
// Activity Types
// ============================================================================

export interface Activity {
  id: string;
  type: string;
  name?: string;
  timestamp: number;
  customer_id?: string;
  customer_identifiers?: { id?: string; email?: string };
  campaign_id?: number;
  broadcast_id?: number;
  delivery_id?: string;
}

// ============================================================================
// Customer API
// ============================================================================

export async function getCustomer(id: string): Promise<Customer> {
  return apiGet<Customer>(`customers/${id}`);
}

export async function searchCustomers(email: string): Promise<Customer[]> {
  const data = await apiGet<Customer[]>(`customers?email=${encodeURIComponent(email)}`);
  return Array.isArray(data) ? data : [data];
}

export async function suppressCustomer(id: string): Promise<void> {
  await apiPost(`customers/${id}/suppress`);
}

// ============================================================================
// Campaign API
// ============================================================================

export async function getCampaigns(): Promise<Campaign[]> {
  const data = await apiGet<{ campaigns: Campaign[] }>("campaigns");
  return data.campaigns || [];
}

export async function getCampaignDetails(id: number): Promise<Campaign> {
  const data = await apiGet<{ campaign: Campaign }>(`campaigns/${id}`);
  return data.campaign;
}

export async function pauseCampaign(id: number): Promise<void> {
  await apiPost(`campaigns/${id}/actions/pause`);
}

export async function resumeCampaign(id: number): Promise<void> {
  await apiPost(`campaigns/${id}/actions/resume`);
}

// ============================================================================
// Message API (uses different auth)
// ============================================================================

export async function sendMessage(customerId: string, message: { subject: string; body: string }): Promise<void> {
  if (!preferences.site_id) throw new Error("Please set your Site ID in extension preferences");
  if (!preferences.api_key) throw new Error("Please set your API Key in extension preferences");
  const response = await fetch(`${pipelinesUrl}customers/${customerId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${preferences.site_id}:${preferences.api_key}`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
  if (!response.ok) throw new Error(`Failed to send message: ${response.statusText}`);
}

// ============================================================================
// Broadcast/Newsletter API
// ============================================================================

async function getNewsletters(): Promise<Broadcast[]> {
  const allNewsletters: Broadcast[] = [];
  let start: string | null = null;
  let hasMore = true;
  let pageCount = 0;
  const maxPages = 100;

  while (hasMore && pageCount < maxPages) {
    let url = `newsletters?limit=100`;
    if (start) {
      url += `&start=${encodeURIComponent(start)}`;
    }

    try {
      const data = await apiGet<{ newsletters?: Broadcast[]; next?: string }>(url);

      if (data.newsletters && Array.isArray(data.newsletters)) {
        const convertedNewsletters: Broadcast[] = data.newsletters.map((newsletter) => ({
          id: newsletter.id,
          name: newsletter.name,
          state: newsletter.sent_at ? "Running" : "Draft",
          created: newsletter.created,
          updated: newsletter.updated,
          type: newsletter.type,
          tags: newsletter.tags,
          deduplicate_id: newsletter.deduplicate_id,
          sent_at: newsletter.sent_at,
          content_ids: newsletter.content_ids,
          recipient_segment_ids: newsletter.recipient_segment_ids,
          subscription_topic_id: newsletter.subscription_topic_id,
        }));

        allNewsletters.push(...convertedNewsletters);

        if (data.next && data.next.length > 0) {
          start = data.next;
          pageCount++;
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }

      if (data.newsletters?.length === 0) {
        hasMore = false;
      }
    } catch {
      if (pageCount === 0) return [];
      break;
    }
  }

  return allNewsletters;
}

export async function getBroadcasts(): Promise<Broadcast[]> {
  // Only return newsletters (exclude API-triggered broadcasts)
  return getNewsletters().catch(() => [] as Broadcast[]);
}

export async function getBroadcastDetails(id: number): Promise<Broadcast> {
  let data: { broadcast?: Broadcast; newsletter?: Broadcast } & Broadcast;
  let isNewsletter = false;

  try {
    data = await apiGet<typeof data>(`broadcasts/${id}`);
  } catch {
    isNewsletter = true;
    data = await apiGet<typeof data>(`newsletters/${id}`);
  }

  const broadcastData = data.broadcast || data.newsletter || data;

  let derivedState = broadcastData.state;
  if (!derivedState) {
    derivedState = broadcastData.sent_at ? "Sent" : isNewsletter ? "Draft" : "unknown";
  }

  return {
    ...broadcastData,
    state: derivedState,
    trigger_data: broadcastData.trigger_data,
    recipient_config: broadcastData.recipient_config,
  };
}

export async function pauseBroadcast(id: number): Promise<void> {
  await apiPost(`broadcasts/${id}/actions/pause`);
}

export async function resumeBroadcast(id: number): Promise<void> {
  await apiPost(`broadcasts/${id}/actions/resume`);
}

// ============================================================================
// Metrics API
// ============================================================================

export async function getBroadcastMetrics(id: number): Promise<CalculatedMetrics | null> {
  try {
    const data = await apiGet<MetricsResponse>(`broadcasts/${id}/metrics?period=days&steps=45`);
    return calculateMetrics(data.metric.series);
  } catch {
    // Try newsletters endpoint if broadcast not found
    try {
      const data = await apiGet<MetricsResponse>(`newsletters/${id}/metrics?period=days&steps=45`);
      return calculateMetrics(data.metric.series);
    } catch {
      return null;
    }
  }
}

export async function getCampaignMetrics(
  id: number,
  period: MetricPeriod = "30days",
): Promise<CalculatedMetrics | null> {
  const now = Math.floor(Date.now() / 1000);
  let endpoint: string;

  switch (period) {
    case "7days": {
      const start = now - 7 * 24 * 60 * 60;
      endpoint = `campaigns/${id}/metrics?res=days&version=2&start=${start}&end=${now}`;
      break;
    }
    case "30days": {
      const start = now - 30 * 24 * 60 * 60;
      endpoint = `campaigns/${id}/metrics?res=days&version=2&start=${start}&end=${now}`;
      break;
    }
    case "12weeks": {
      const start = now - 12 * 7 * 24 * 60 * 60;
      endpoint = `campaigns/${id}/metrics?res=weeks&version=2&start=${start}&end=${now}`;
      break;
    }
    case "12months": {
      const start = now - 365 * 24 * 60 * 60;
      endpoint = `campaigns/${id}/metrics?res=months&version=2&start=${start}&end=${now}`;
      break;
    }
  }

  try {
    const data = await apiGet<MetricsResponse>(endpoint);
    return calculateMetrics(data.metric.series);
  } catch {
    return null;
  }
}

// Helper function to sum up metrics series and calculate rates
function calculateMetrics(series: MetricsSeries): CalculatedMetrics {
  // Sum all values in each series
  const sum = (arr?: number[]) => (arr ? arr.reduce((acc, val) => acc + val, 0) : 0);

  const sent = sum(series.sent);
  const delivered = sum(series.delivered);
  const opened = sum(series.opened) || sum(series.human_opened);
  const clicked = sum(series.clicked) || sum(series.human_clicked);
  const converted = sum(series.converted);
  const bounced = sum(series.bounced);
  const unsubscribed = sum(series.unsubscribed);
  const failed = sum(series.failed);
  const spammed = sum(series.spammed);
  const suppressed = sum(series.suppressed);

  // Calculate rates (avoid division by zero)
  const safePercent = (numerator: number, denominator: number) =>
    denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0;

  return {
    sent,
    delivered,
    opened,
    clicked,
    converted,
    bounced,
    unsubscribed,
    failed,
    spammed,
    suppressed,
    deliveryRate: safePercent(delivered, sent),
    openRate: safePercent(opened, delivered),
    clickRate: safePercent(clicked, delivered),
    clickToOpenRate: safePercent(clicked, opened),
    conversionRate: safePercent(converted, delivered),
    bounceRate: safePercent(bounced, sent),
    unsubscribeRate: safePercent(unsubscribed, delivered),
    spamRate: safePercent(spammed, delivered),
  };
}

// ============================================================================
// Segment API
// ============================================================================

export async function getSegments(): Promise<Segment[]> {
  const data = await apiGet<{ segments: Segment[] }>("segments");
  return data.segments || [];
}

export async function getSegmentDetails(id: number): Promise<Segment> {
  const data = await apiGet<{ segment: Segment }>(`segments/${id}`);
  return data.segment;
}

export async function getSegmentDependencies(id: number): Promise<SegmentDependencies> {
  return apiGet<SegmentDependencies>(`segments/${id}/used_by`);
}

// Fetch segment usage with enriched campaign/newsletter names
export async function getSegmentUsage(id: number): Promise<SegmentUsageSummary> {
  const deps = await getSegmentDependencies(id);

  const campaignIds = deps.used_by?.campaigns || [];
  const sentNewsletterIds = deps.used_by?.sent_newsletters || [];
  const draftNewsletterIds = deps.used_by?.draft_newsletters || [];

  // Fetch campaign details in parallel
  const campaigns: SegmentUsageItem[] = await Promise.all(
    campaignIds.map(async (campaignId) => {
      try {
        const campaign = await getCampaignDetails(campaignId);
        return { id: campaignId, name: campaign.name, state: campaign.state };
      } catch {
        return { id: campaignId, name: `Campaign #${campaignId}` };
      }
    }),
  );

  // Fetch broadcast details in parallel (newsletters are broadcasts in Customer.io)
  const allBroadcastIds = [...sentNewsletterIds, ...draftNewsletterIds];
  const broadcasts: SegmentUsageItem[] = await Promise.all(
    allBroadcastIds.map(async (broadcastId) => {
      try {
        const broadcast = await getBroadcastDetails(broadcastId);
        const state = sentNewsletterIds.includes(broadcastId) ? "Sent" : "Draft";
        return { id: broadcastId, name: broadcast.name, state };
      } catch {
        const state = sentNewsletterIds.includes(broadcastId) ? "Sent" : "Draft";
        return { id: broadcastId, name: `Broadcast #${broadcastId}`, state };
      }
    }),
  );

  return {
    campaigns,
    newsletters: broadcasts,
    campaignCount: campaigns.length,
    newsletterCount: broadcasts.length,
  };
}

export async function getSegmentCount(id: number): Promise<number> {
  const data = await apiGet<{ count: number }>(`segments/${id}/customer_count`);
  return data.count;
}

export async function getSegmentMembers(
  id: number,
  limit = 50,
  start?: string,
): Promise<{ members: SegmentMember[]; next?: string }> {
  let url = `segments/${id}/membership?limit=${limit}`;
  if (start) {
    url += `&start=${encodeURIComponent(start)}`;
  }
  const data = await apiGet<{ identifiers?: SegmentMember[]; ids?: string[]; next?: string }>(url);
  // API returns 'identifiers' with full member objects, fallback to 'ids' if not present
  const members = data.identifiers || (data.ids ? data.ids.map((id) => ({ id })) : []);
  return { members, next: data.next };
}

// ============================================================================
// Customer Profile API
// ============================================================================

// Helper function to normalize customer profile data from API
function normalizeCustomerProfile(customer: CustomerProfile): CustomerProfile {
  // Extract created_at from timestamps or attributes if not directly available
  if (!customer.created_at || customer.created_at === 0) {
    if (customer.timestamps?.created_at) {
      customer.created_at = customer.timestamps.created_at;
    } else if (customer.attributes?.created_at) {
      const attrCreatedAt = customer.attributes.created_at;
      customer.created_at = typeof attrCreatedAt === "string" ? parseInt(attrCreatedAt, 10) : (attrCreatedAt as number);
    }
  }
  return customer;
}

export async function getCustomersByEmail(query: string): Promise<CustomerProfile[]> {
  const results: CustomerProfile[] = [];

  // Try email search (exact match only supported by API)
  try {
    const data = await apiGet<{ results: CustomerProfile[] }>(`customers?email=${encodeURIComponent(query)}`);
    if (data.results && data.results.length > 0) {
      results.push(...data.results.map(normalizeCustomerProfile));
    }
  } catch {
    // Email search failed, continue with other methods
  }

  // If query looks like an email address, also try direct lookup by email
  if (query.includes("@") && results.length === 0) {
    try {
      const customer = await getCustomerAttributes(query, "email");
      if (customer) {
        results.push(customer);
      }
    } catch {
      // Direct email lookup failed
    }
  }

  // If query looks like an ID (numeric or alphanumeric), try direct lookup
  if (results.length === 0 && /^[a-zA-Z0-9_-]+$/.test(query)) {
    try {
      const customer = await getCustomerAttributes(query, "id");
      if (customer) {
        results.push(customer);
      }
    } catch {
      // ID lookup failed
    }
  }

  return results;
}

export async function getCustomerAttributes(
  id: string,
  idType: "id" | "cio_id" | "email" = "id",
): Promise<CustomerProfile> {
  const data = await apiGet<{ customer: CustomerProfile }>(
    `customers/${encodeURIComponent(id)}/attributes?id_type=${idType}`,
  );
  return normalizeCustomerProfile(data.customer);
}

export async function getCustomerSegments(id: string, idType: "id" | "cio_id" | "email" = "id"): Promise<Segment[]> {
  const data = await apiGet<{ segments: Segment[] }>(`customers/${encodeURIComponent(id)}/segments?id_type=${idType}`);
  return data.segments || [];
}

export async function getCustomerMessages(
  id: string,
  idType: "id" | "cio_id" | "email" = "id",
  limit = 20,
): Promise<CustomerMessage[]> {
  const data = await apiGet<{ messages: CustomerMessage[] }>(
    `customers/${encodeURIComponent(id)}/messages?id_type=${idType}&limit=${limit}`,
  );
  return data.messages || [];
}

export async function getCustomerActivities(
  id: string,
  idType: "id" | "cio_id" | "email" = "id",
  limit = 20,
): Promise<CustomerActivity[]> {
  const data = await apiGet<{ activities: CustomerActivity[] }>(
    `customers/${encodeURIComponent(id)}/activities?id_type=${idType}&limit=${limit}`,
  );
  return data.activities || [];
}

// ============================================================================
// Activity API
// ============================================================================

export async function getActivities(
  type?: string,
  limit = 50,
  start?: string,
): Promise<{ activities: Activity[]; next?: string }> {
  let url = `activities?limit=${limit}`;
  if (type) {
    url += `&type=${encodeURIComponent(type)}`;
  }
  if (start) {
    url += `&start=${encodeURIComponent(start)}`;
  }
  const data = await apiGet<{ activities: Activity[]; next?: string }>(url);
  return { activities: data.activities || [], next: data.next };
}
