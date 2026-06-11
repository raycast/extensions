import { Icon } from "@raycast/api";
import { Category } from "./types";

export const CATEGORY_ICONS: Record<string, Icon> = {
  auto: Icon.Car,
  personal_care: Icon.Person,
  shopping: Icon.Cart,
  children: Icon.TwoPeople,
  debt_repayment: Icon.BankNote,
  communications: Icon.Phone,
  eating_out: Icon.Mug,
  education: Icon.Book,
  fees: Icon.Coins,
  groceries: Icon.Cart,
  health_medical: Icon.Heartbeat,
  home: Icon.House,
  holiday_leisure: Icon.Airplane,
  media: Icon.Monitor,
  entertainment: Icon.GameController,
  taxes: Icon.Receipt,
  transport: Icon.Train,
  utilities: Icon.LightBulb,
  gifts_donations: Icon.Gift,
  business_expense: Icon.Building,
  salary: Icon.BankNote,
  other_income: Icon.Plus,
  transfer: Icon.Switch,
  uncategorized: Icon.QuestionMark,
  financial_services: Icon.BarChart,
  investments: Icon.LineChart,
  sporting_goods: Icon.Person,
  electronics: Icon.ComputerChip,
  clothing: Icon.Tag,
  cafe_coffee_shop: Icon.Mug,
  restaurant: Icon.Mug,
  train: Icon.Train,
  bus: Icon.Train,
  taxi: Icon.Car,
  air_travel: Icon.Airplane,
  hotel: Icon.House,
  books_supplies: Icon.Book,
  tuition: Icon.Book,
  charity: Icon.Heart,
  cash_atm: Icon.BankNote,
};

export const CATEGORY_ICON_OPTIONS = Object.entries(CATEGORY_ICONS)
  .map(([key, icon]) => ({ key, icon, title: formatIconKey(key) }))
  .sort((a, b) => a.title.localeCompare(b.title));

export function getCategoryIcon(iconKey?: string | null): Icon {
  return iconKey ? CATEGORY_ICONS[iconKey] || Icon.Tag : Icon.Tag;
}

export function getCategoryDisplayIcon(
  category: Category,
  categoriesById?: Map<number, Category>,
  seenCategoryIds = new Set<number>(),
): Icon {
  if (seenCategoryIds.has(category.id)) {
    return Icon.Tag;
  }
  seenCategoryIds.add(category.id);

  if (category.icon_key && CATEGORY_ICONS[category.icon_key]) {
    return CATEGORY_ICONS[category.icon_key];
  }

  const parent = category.parent_id ? categoriesById?.get(category.parent_id) : undefined;
  return parent ? getCategoryDisplayIcon(parent, categoriesById, seenCategoryIds) : Icon.Tag;
}

export function isCustomCategory(category: Category): boolean {
  return category.guest_id !== 0;
}

export function isParentCategory(category: Category): boolean {
  return category.parent_id === null;
}

export function getCategoryParentId(category: Category, categoriesById?: Map<number, Category>): number {
  let current = category;
  const seenCategoryIds = new Set<number>();

  while (current.parent_id) {
    if (seenCategoryIds.has(current.id)) return current.parent_id;
    seenCategoryIds.add(current.id);

    const parent = categoriesById?.get(current.parent_id);
    if (!parent) return current.parent_id;
    current = parent;
  }

  return current.id;
}

export function getCategoryParentName(category: Category, categoriesById: Map<number, Category>): string | undefined {
  return category.parent_id ? categoriesById.get(category.parent_id)?.name : undefined;
}

function formatIconKey(key: string): string {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
