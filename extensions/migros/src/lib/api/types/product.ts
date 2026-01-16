// Product-related types for the Migros API client

export interface ProductCard {
  uid: number;
  migrosId: string;
  migrosOnlineId?: string;
  name: string;
  brand?: string;
  brandLine?: string;
  versioning?: string;
  title?: string;
  description?: string;
  productRange?: string;
  productAvailability?: string;
  gtins?: string[];
  images?: Array<{
    cdn: string;
    url: string;
  }>;
  imageTransparent?: {
    cdn: string;
    url: string;
  };
  breadcrumb?: Array<{
    id: string;
    name: string;
    slugs: string[];
  }>;
  productUrls?: string;
  isMgbCompatible?: boolean;
  isConsignmentProduct?: boolean;
  offer?: ProductOffer;
  [key: string]: unknown;
}

export interface ProductOffer {
  price?: ProductPrice;
  promotionPrice?: ProductPrice;
  priceInsteadOfLabel?: string;
  quantity?: string;
  quantityPrice?: string;
  isVariableWeight?: boolean;
  channel?: {
    offerType?: string;
    region?: string;
  };
  maxOrderableQuantityV2?: number;
  badges?: Array<{
    type: string;
    description: string;
    enrichedDescription?: string;
    rawDescription?: string;
  }>;
  promotionDateRange?: {
    startDate?: string;
    endDate?: string;
  };
  isNewOffer?: boolean;
  isNotMorningDeliverable?: boolean;
  displayPrice?: boolean;
  type?: string;
}

export interface ProductPrice {
  displayUnitPrice?: boolean;
  advertisedDisplayValue?: string;
  effectiveDisplayValue?: string;
  multiplier?: number;
  effectiveValue?: number;
  advertisedValue?: number;
  value?: number; // legacy field
  unitPrice?: {
    value?: number;
    unit?: string;
  };
}

export interface ProductCardsOptions {
  productFilter: {
    uids: Array<string | number>;
  };
  offerFilter?: {
    storeType?: string;
    region?: string;
    ongoingOfferDate?: string;
  };
  language?: string;
}

export interface SearchCategory {
  id: number;
  name: string;
  numberOfProducts: number;
  slug: string;
  path?: string;
  type?: string;
  level?: number;
}

export interface ProductSearchResult {
  productIds?: Array<number | string>;
  categories?: SearchCategory[];
  numberOfProducts?: number;
  catalogItems?: unknown[];
  products?: unknown[];
  [k: string]: unknown;
}

export interface SearchFilters {
  category?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Product Detail types (extended product information)
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductDetailOptions {
  productFilter: {
    migrosIds: string[];
  };
  offerFilter?: {
    storeType?: string;
    warehouseId?: number;
    region?: string;
    ongoingOfferDate?: string;
  };
  language?: string;
}

export interface ProductRating {
  nbReviews: number;
  nbStars: number;
}

export interface ProductCarbonFootprint {
  rating?: number;
  co2CarKmEquivalent?: number;
  productionRatio?: number;
  transportRatio?: number;
  packagingRatio?: number;
  image?: string;
  stackImage?: string;
  co2KgRange?: string;
}

export interface ProductMcheck {
  carbonFootprint?: ProductCarbonFootprint;
}

export interface ProductBrand {
  name: string;
  slug?: string;
  imagePath?: string;
}

export interface ProductMainInformation {
  brand?: ProductBrand;
  ingredients?: string;
  allergenIndication?: string;
  allergens?: string;
  origin?: string;
  mcheck?: ProductMcheck;
  rating?: ProductRating;
  migipediaUrl?: string;
}

export interface NutrientsTableRow {
  label: string;
  values: string[];
  fsaLevel?: string;
}

export interface NutrientsTableHeader {
  value: string;
  infoText?: string;
}

export interface ProductNutrientsInformation {
  nutrientsTable?: {
    headers: string[];
    rows: NutrientsTableRow[];
  };
  nutrientsTableV2?: {
    headers: NutrientsTableHeader[];
    rows: NutrientsTableRow[];
  };
  portionSentence?: string;
  isAnalyticalConstituents?: boolean;
}

export interface ProductUsageInformation {
  usage?: string;
}

export interface ProductRemark {
  code: string;
  value: string;
}

export interface ProductSpecificity {
  code: string;
  value: string;
}

export interface ProductOtherInformation {
  articleNumber?: string;
  legalDesignation?: string;
  distributorName?: string;
  distributorStreetAndNumber?: string;
  remarks?: ProductRemark[];
  mainSpecificities?: ProductSpecificity[];
}

export interface ProductInformation {
  mainInformation?: ProductMainInformation;
  nutrientsInformation?: ProductNutrientsInformation;
  usageInformation?: ProductUsageInformation;
  otherInformation?: ProductOtherInformation;
}

export interface ProductDetail {
  uid: number;
  migrosId: string;
  migrosOnlineId?: string;
  name: string;
  brand?: string;
  brandLine?: string;
  versioning?: string;
  title?: string;
  description?: string;
  productRange?: string;
  productAvailability?: string;
  gtins?: string[];
  images?: Array<{
    cdn: string;
    url: string;
  }>;
  imageTransparent?: {
    cdn: string;
    url: string;
  };
  breadcrumb?: Array<{
    id: string;
    name: string;
    slugs: string[];
  }>;
  productUrls?: string;
  isMgbCompatible?: boolean;
  isConsignmentProduct?: boolean;
  productInformation?: ProductInformation;
  offer?: ProductOffer;
  [key: string]: unknown;
}
