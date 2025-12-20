import type { MenuItem, MenuResponse } from "wolt-api";

/**
 * Creates a map of category ID/slug to category name
 */
export function createCategoryMap(menuResponse: MenuResponse): Record<string, string> {
  if (!menuResponse.categories) {
    return {};
  }

  return menuResponse.categories.reduce(
    (acc, cat) => {
      acc[cat.id] = cat.name;
      acc[cat.slug] = cat.name; // Also map by slug for compatibility
      return acc;
    },
    {} as Record<string, string>,
  );
}

/**
 * Groups menu items by category
 */
export function groupMenuItemsByCategory(menuResponse: MenuResponse): Record<string, MenuItem[]> {
  if (!menuResponse.items) {
    return {};
  }

  const categoryMap = createCategoryMap(menuResponse);

  return menuResponse.items.reduce(
    (acc, item) => {
      const categoryId = item.category || "Other";
      const categoryName = categoryMap[categoryId] || categoryId;
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(item);
      return acc;
    },
    {} as Record<string, MenuItem[]>,
  );
}

/**
 * Formats price with currency
 */
export function formatPrice(baseprice: number, currency?: string, unitPrice?: string): string {
  const price = baseprice / 100;
  const unitPriceStr = unitPrice ? ` / ${unitPrice}` : "";
  return currency ? `${price.toFixed(2)} ${currency}${unitPriceStr}` : `${price.toFixed(2)}${unitPriceStr}`;
}

/**
 * Builds subtitle for menu item
 */
export function buildMenuItemSubtitle(item: MenuItem, currency?: string, isHighlighted = false): string {
  const priceFormatted = formatPrice(item.baseprice, currency, item.unit_price);
  const subtitleParts = [];

  if (isHighlighted) {
    subtitleParts.push("🔍 Searched");
  }
  if (item.enabled === false) {
    subtitleParts.push("Unavailable");
  }
  if (item.wolt_plus_only) {
    subtitleParts.push("Wolt+");
  }
  subtitleParts.push(priceFormatted);

  return subtitleParts.join(" • ");
}

/**
 * Builds URL for a menu item
 */
export function buildItemUrl(
  itemId: string,
  venueId: string,
  venueSlug: string,
  citySlug?: string,
  countryCode?: string,
): string {
  // Construct item URL: https://wolt.com/en/{country_code}/{city_slug}/restaurant/{venue_slug}/{venue_slug}-itemid-{item_id}
  if (citySlug && countryCode && venueSlug) {
    return `https://wolt.com/en/${countryCode}/${citySlug}/restaurant/${venueSlug}/${venueSlug}-itemid-${itemId}`;
  }
  if (venueSlug) {
    return `https://wolt.com/en/venue/${venueSlug}/${venueSlug}-itemid-${itemId}`;
  }
  return `https://wolt.com/en/venue/${venueId}/${venueId}-itemid-${itemId}`;
}

/**
 * Builds URL for a venue
 */
export function buildVenueUrl(venueSlug: string, citySlug?: string, countryCode?: string): string {
  if (citySlug && countryCode) {
    return `https://wolt.com/en/${countryCode}/${citySlug}/restaurant/${venueSlug}`;
  }
  return `https://wolt.com/en/venue/${venueSlug}`;
}
