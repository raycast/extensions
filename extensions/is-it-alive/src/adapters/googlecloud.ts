import type {
  ComponentStatus,
  ComponentStatusValue,
  DayStatus,
  FetchSnapshotInput,
  StatusAdapter,
  StatusIncident,
  StatusIndicator,
  StatusSnapshot,
} from "@/types";
import { normalizeSiteUrl } from "@/lib/url";
import { fetchJson } from "@/lib/fetch-json";
import { overallDescription } from "@/lib/snapshot-text";
import { buildPageHistoryFromComponents } from "@/lib/uptime-chart";
import type {
  GoogleCloudIncident,
  GoogleCloudProduct,
  GoogleCloudProductsResponse,
} from "@/types/googlecloud";

const GOOGLE_CLOUD_HOST = "status.cloud.google.com";
const GOOGLE_CLOUD_PAGE = "https://status.cloud.google.com";
const INCIDENTS_URL = `${GOOGLE_CLOUD_PAGE}/incidents.json`;
const PRODUCTS_URL = `${GOOGLE_CLOUD_PAGE}/products.json`;
const HISTORY_DAYS = 90;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The dashboard has no per-product URLs, so we support a path convention:
 * status.cloud.google.com/products/vertex-gemini-api (product title slug,
 * matched loosely against products.json). The bare domain covers all of
 * Google Cloud.
 */
function productQueryFromUrl(siteUrl: string): string | null {
  const url = new URL(normalizeSiteUrl(siteUrl));
  const match = url.pathname.match(/^\/products\/([^/]+)/);
  return match ? slugify(decodeURIComponent(match[1])) : null;
}

function matchProducts(
  products: GoogleCloudProduct[],
  querySlug: string,
): GoogleCloudProduct[] {
  const exact = products.filter(
    (product) => slugify(product.title) === querySlug,
  );
  if (exact.length > 0) {
    return exact;
  }

  return products.filter((product) =>
    slugify(product.title).includes(querySlug),
  );
}

function isActive(incident: GoogleCloudIncident): boolean {
  return !incident.end;
}

function impactToComponentStatus(
  statusImpact: string | undefined,
): ComponentStatusValue {
  switch (statusImpact) {
    case "SERVICE_OUTAGE":
      return "major_outage";
    case "SERVICE_DISRUPTION":
      return "partial_outage";
    default:
      return "degraded_performance";
  }
}

function impactToDayLevel(
  statusImpact: string | undefined,
): DayStatus["level"] {
  switch (statusImpact) {
    case "SERVICE_OUTAGE":
      return "major";
    case "SERVICE_DISRUPTION":
      return "partial";
    default:
      return "degraded";
  }
}

function impactToIndicator(statusImpact: string | undefined): StatusIndicator {
  switch (statusImpact) {
    case "SERVICE_OUTAGE":
      return "critical";
    case "SERVICE_DISRUPTION":
      return "major";
    default:
      return "minor";
  }
}

function impactToIncidentImpact(
  statusImpact: string | undefined,
): StatusIndicator {
  switch (statusImpact) {
    case "SERVICE_OUTAGE":
      return "critical";
    case "SERVICE_DISRUPTION":
      return "major";
    default:
      return "minor";
  }
}

const INDICATOR_SEVERITY: Record<StatusIndicator, number> = {
  none: 0,
  minor: 1,
  major: 2,
  critical: 3,
};

const DAY_LEVEL_SEVERITY: Record<DayStatus["level"], number> = {
  operational: 0,
  unknown: 0,
  degraded: 1,
  partial: 2,
  major: 3,
};

function worstIndicator(indicators: StatusIndicator[]): StatusIndicator {
  return indicators.reduce<StatusIndicator>(
    (worst, indicator) =>
      INDICATOR_SEVERITY[indicator] > INDICATOR_SEVERITY[worst]
        ? indicator
        : worst,
    "none",
  );
}

function affectsProduct(
  incident: GoogleCloudIncident,
  productId: string,
): boolean {
  return (incident.affected_products ?? []).some(
    (product) => product.id === productId,
  );
}

function buildProductHistory(
  productId: string,
  incidents: GoogleCloudIncident[],
): DayStatus[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayMap = new Map<string, DayStatus["level"]>();
  for (let i = 0; i < HISTORY_DAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (HISTORY_DAYS - 1 - i));
    dayMap.set(d.toISOString().slice(0, 10), "operational");
  }

  for (const incident of incidents) {
    if (!affectsProduct(incident, productId)) {
      continue;
    }

    const level = impactToDayLevel(incident.status_impact);
    const start = new Date(incident.begin);
    const end = incident.end ? new Date(incident.end) : today;

    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    while (cursor <= endDay) {
      const key = cursor.toISOString().slice(0, 10);
      const existing = dayMap.get(key);
      if (
        existing !== undefined &&
        DAY_LEVEL_SEVERITY[level] > DAY_LEVEL_SEVERITY[existing]
      ) {
        dayMap.set(key, level);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, level]) => ({ date, level }));
}

function componentStatusFor(
  productId: string,
  activeIncidents: GoogleCloudIncident[],
): ComponentStatusValue {
  const affecting = activeIncidents.filter((incident) =>
    affectsProduct(incident, productId),
  );
  if (affecting.length === 0) {
    return "operational";
  }

  let worst: ComponentStatusValue = "degraded_performance";
  for (const incident of affecting) {
    const status = impactToComponentStatus(incident.status_impact);
    if (status === "major_outage") {
      return "major_outage";
    }
    if (status === "partial_outage") {
      worst = "partial_outage";
    }
  }
  return worst;
}

function mapIncidents(incidents: GoogleCloudIncident[]): StatusIncident[] {
  return incidents.map((incident) => ({
    id: incident.id,
    name: incident.external_desc ?? "Google Cloud incident",
    status: "investigating",
    impact: impactToIncidentImpact(incident.status_impact),
    updatedAt:
      incident.most_recent_update?.when ?? incident.modified ?? incident.begin,
    body: incident.most_recent_update?.text,
    affectedComponentIds: (incident.affected_products ?? []).map(
      (product) => product.id,
    ),
  }));
}

export const googleCloudAdapter: StatusAdapter = {
  async detect(siteUrl: string): Promise<boolean> {
    try {
      return new URL(normalizeSiteUrl(siteUrl)).hostname === GOOGLE_CLOUD_HOST;
    } catch {
      return false;
    }
  },

  async fetchSnapshot(input: FetchSnapshotInput): Promise<StatusSnapshot> {
    const fetchedAt = new Date().toISOString();
    const pageUrl = normalizeSiteUrl(input.url);

    try {
      const querySlug = productQueryFromUrl(input.url);

      const [incidents, productsResponse] = await Promise.all([
        fetchJson<GoogleCloudIncident[]>(INCIDENTS_URL),
        fetchJson<GoogleCloudProductsResponse>(PRODUCTS_URL),
      ]);

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - HISTORY_DAYS);
      const recentIncidents = incidents.filter(
        (incident) =>
          isActive(incident) ||
          new Date(incident.end ?? incident.begin) >= cutoff,
      );

      let selectedProducts: GoogleCloudProduct[];
      let pageName: string;

      if (querySlug) {
        selectedProducts = matchProducts(
          productsResponse.products ?? [],
          querySlug,
        );
        if (selectedProducts.length === 0) {
          throw new Error(
            `No Google Cloud product matches "${querySlug}". Check the product name on status.cloud.google.com.`,
          );
        }
        pageName =
          selectedProducts.length === 1
            ? selectedProducts[0].title
            : `Google Cloud (${selectedProducts.length} products)`;
      } else {
        // Whole-cloud view: only show products that had incidents recently,
        // since listing all ~200 products as operational adds no signal.
        const affectedIds = new Set(
          recentIncidents.flatMap((incident) =>
            (incident.affected_products ?? []).map((product) => product.id),
          ),
        );
        selectedProducts = (productsResponse.products ?? []).filter((product) =>
          affectedIds.has(product.id),
        );
        pageName = "Google Cloud";
      }

      const selectedIds = new Set(
        selectedProducts.map((product) => product.id),
      );
      const relevantIncidents = recentIncidents.filter((incident) =>
        (incident.affected_products ?? []).some((product) =>
          selectedIds.has(product.id),
        ),
      );
      const activeIncidents = relevantIncidents.filter(isActive);

      const components: ComponentStatus[] = selectedProducts.map((product) => ({
        id: product.id,
        name: product.title,
        status: componentStatusFor(product.id, activeIncidents),
        historyDays: buildProductHistory(product.id, relevantIncidents),
      }));

      const mappedIncidents = mapIncidents(activeIncidents);
      const indicator = worstIndicator(
        activeIncidents.map((incident) =>
          impactToIndicator(incident.status_impact),
        ),
      );

      return {
        pageName,
        pageUrl,
        overallDescription: overallDescription(
          indicator,
          mappedIncidents.length,
        ),
        indicator,
        components,
        incidents: mappedIncidents,
        historyDays: buildPageHistoryFromComponents(components),
        fetchedAt,
      };
    } catch (error) {
      return {
        pageName: "Google Cloud",
        pageUrl,
        overallDescription: "Failed to fetch",
        indicator: "none",
        components: [],
        incidents: [],
        fetchedAt,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
