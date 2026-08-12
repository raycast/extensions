// Promotion-related types for the Migros API client

export interface PromotionBadge {
  type: string;
  description: string;
  enrichedDescription?: string;
  rawDescription?: string;
}

export interface PromotionCategory {
  id: string;
  name: string;
  slugs: string[];
}

export interface PromotionDetail {
  id: string;
  description: string;
  discountHint?: string;
  image?: {
    cdn: string;
    url: string;
  };
  badges?: PromotionBadge[];
  categories?: PromotionCategory[];
  productIds: number[];
  firstMigrosId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PromotionProductIds {
  id: string;
  productId: number[];
}

export interface PromotionsResponse {
  promotionsProductIds: PromotionProductIds[];
  promotionDetails: PromotionDetail[];
}
