import { Color, LocalStorage } from "@raycast/api";
import { updateJson } from "@/core/fs/storage";

// 一个分类选项：名字必填；颜色、顺序可选（Stage 用颜色+顺序，Genre/Collection 不用）。
export type TaxonomyOption = {
  id: string;
  name: string;
  color?: Color;
  order?: number;
};

export type Taxonomy = {
  get: () => Promise<TaxonomyOption[]>;
  save: (options: TaxonomyOption[]) => Promise<void>;
  reset: () => Promise<void>;
};

/** 由名字生成选项 id：小写、空白转连字符、去掉其余符号；全是非 ASCII 字符时退回小写原名。 */
export function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return slug || name.trim().toLowerCase();
}

function parseOptions(value: unknown): TaxonomyOption[] {
  return Array.isArray(value) ? (value as TaxonomyOption[]) : [];
}

// 工厂：给一个存储 key + 默认种子，返回这套分类的 get/save/reset。
export function createTaxonomy(storageKey: string, defaults: TaxonomyOption[]): Taxonomy {
  async function save(options: TaxonomyOption[]): Promise<void> {
    // 整张覆盖；存储损坏时 updateJson 拒绝写入，避免把自定义分类覆盖掉。
    await updateJson(
      storageKey,
      parseOptions,
      () => [],
      () => options,
    );
  }

  async function get(): Promise<TaxonomyOption[]> {
    const stored = await LocalStorage.getItem<string>(storageKey);

    if (!stored) {
      await save(defaults);
      return [...defaults];
    }

    try {
      const parsed: unknown = JSON.parse(stored);
      return Array.isArray(parsed) ? sortOptions(parsed as TaxonomyOption[]) : [...defaults];
    } catch {
      // 损坏：先返回默认值供界面显示，但保留损坏的存储、不写回，等待用户处理。
      return [...defaults];
    }
  }

  async function reset(): Promise<void> {
    await save(defaults);
  }

  return { get, save, reset };
}

// 有 order 的优先按用户顺序排列；没有 order 的按名称排列并置于末尾。
function sortOptions(options: TaxonomyOption[]): TaxonomyOption[] {
  return [...options].sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;

    return orderA - orderB || a.name.localeCompare(b.name);
  });
}
