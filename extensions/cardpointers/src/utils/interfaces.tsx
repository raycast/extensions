export interface Card {
  title: string;
  subtitle: string;
  slug: string;
  expired: boolean;
  nickname: string;
  card_id: number;
  bonus: string;
  months: string;
  spend: string;
  applicationNotes: string;
  currency: string;
  foreignFees: boolean;
  bankName: string;
  network: string;
  phone: string;
  reconsideration: string;
  fee: number;
  earnings: [Earning];
  features: [Feature];
}

export interface SearchResult {
  name: string;
  subtitle: string;
  slug: string;
  expired: boolean;
}

export interface Offer {
  title: string;
  subtitle: string;
  slug: string;
  expired: boolean;
  url: string;
  terms: string;
  end: string;
  bank_name: string;
  value: string;
  total_available: string;
  is_minimum_required: boolean;
  related: [Offer];
  cards: [SearchResult];
}

export interface Earning {
  name: string;
  value: number;
  category_id: number;
  category_name: string;
  points: number;
  icon: string;
}

export interface Feature {
  name: string;
}

export interface CardNameQuery {
  cardName: string;
}

export interface OfferNameQuery {
  offerName: string;
}

export interface CardDataResponse {
  success: boolean;
  results: [Card];
  cards: [Card];
}

export interface OfferDataResponse {
  success: boolean;
  results: [Offer];
  offers: [Offer];
}
