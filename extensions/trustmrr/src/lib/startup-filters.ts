export const MAX_PAGE_SIZE = 10;

export const SORT_OPTIONS = [
  { value: "revenue-desc", title: "Revenue: High to Low" },
  { value: "revenue-asc", title: "Revenue: Low to High" },
  { value: "price-desc", title: "Price: High to Low" },
  { value: "price-asc", title: "Price: Low to High" },
  { value: "multiple-asc", title: "Multiple: Low to High" },
  { value: "multiple-desc", title: "Multiple: High to Low" },
  { value: "growth-desc", title: "Growth: High to Low" },
  { value: "growth-asc", title: "Growth: Low to High" },
  { value: "listed-desc", title: "Recently Listed" },
  { value: "listed-asc", title: "Oldest Listings" },
  { value: "best-deal", title: "Best Deal" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export const CATEGORY_LABELS = {
  ai: "AI",
  saas: "SaaS",
  "developer-tools": "Developer Tools",
  fintech: "Fintech",
  marketing: "Marketing",
  ecommerce: "Ecommerce",
  productivity: "Productivity",
  "design-tools": "Design Tools",
  "no-code": "No-Code",
  analytics: "Analytics",
  "crypto-web3": "Crypto & Web3",
  education: "Education",
  "health-fitness": "Health & Fitness",
  "social-media": "Social Media",
  "content-creation": "Content Creation",
  sales: "Sales",
  "customer-support": "Customer Support",
  recruiting: "Recruiting",
  "real-estate": "Real Estate",
  travel: "Travel",
  legal: "Legal",
  security: "Security",
  "iot-hardware": "IoT Hardware",
  "green-tech": "Green Tech",
  entertainment: "Entertainment",
  games: "Games",
  community: "Community",
  "news-magazines": "News & Magazines",
  utilities: "Utilities",
  marketplace: "Marketplace",
  "mobile-apps": "Mobile Apps",
} as const;

export type CategoryValue = keyof typeof CATEGORY_LABELS;
export const CATEGORY_VALUES = Object.keys(CATEGORY_LABELS) as CategoryValue[];

export function isCategoryValue(value: string): value is CategoryValue {
  return Object.hasOwn(CATEGORY_LABELS, value);
}

export function isSortValue(value: string): value is SortValue {
  return SORT_OPTIONS.some((option) => option.value === value);
}
