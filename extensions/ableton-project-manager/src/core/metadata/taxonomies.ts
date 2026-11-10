import { Color, LocalStorage } from "@raycast/api";
import { createTaxonomy, type Taxonomy, type TaxonomyOption } from "./taxonomy";
import { TRACK_ROLES } from "./track-role";

// Stage 默认 7 档流水线(有序 + 配色)。
export const STAGE_DEFAULTS: TaxonomyOption[] = [
  { id: "demo", name: "Demo", color: Color.PrimaryText, order: 1 },
  { id: "recording", name: "Recording", color: Color.Red, order: 2 },
  { id: "production", name: "Production", color: Color.Blue, order: 3 },
  { id: "mix", name: "Mix", color: Color.Yellow, order: 4 },
  { id: "master", name: "Master", color: Color.Orange, order: 5 },
  { id: "done", name: "Done", color: Color.Magenta, order: 6 },
  { id: "released", name: "Released", color: Color.Green, order: 7 },
];

// Stage:带色、有序、7 档种子。
export const stageTaxonomy = createTaxonomy("stage-options", STAGE_DEFAULTS);

// Genre 默认预设：无色；初始按名称排序，允许用户自定义顺序。
const GENRE_DEFAULTS: TaxonomyOption[] = [
  { id: "house", name: "House" },
  { id: "techno", name: "Techno" },
  { id: "hip-hop", name: "Hip-Hop" },
  { id: "trap", name: "Trap" },
  { id: "pop", name: "Pop" },
  { id: "r-and-b", name: "R&B" },
  { id: "rock", name: "Rock" },
  { id: "ambient", name: "Ambient" },
  { id: "experimental", name: "Experimental" },
  { id: "lo-fi", name: "Lo-Fi" },
  { id: "indie", name: "Indie" },
  { id: "jazz", name: "Jazz" },
];

const GENRE_SEED_KEY = "genre-options-seeded-v1";
const genreTaxonomyBase = createTaxonomy("genre-options", []);

export const genreTaxonomy: Taxonomy = {
  async get() {
    const options = await genreTaxonomyBase.get();
    const seeded = await LocalStorage.getItem<string>(GENRE_SEED_KEY);

    if (seeded === "true") {
      return options;
    }

    const existingIds = new Set(options.map((option) => option.id));
    const existingNames = new Set(options.map((option) => option.name.trim().toLowerCase()));

    const missingGenres = GENRE_DEFAULTS.filter(
      (option) => !existingIds.has(option.id) && !existingNames.has(option.name.trim().toLowerCase()),
    );
    // 已有明确顺序时，将新增预设追加到末尾，不打乱用户的排序。
    const hasCustomOrder = options.some((option) => option.order !== undefined);
    const maxOrder = Math.max(0, ...options.map((option) => option.order ?? 0));

    const additions = missingGenres.map((option, index) =>
      hasCustomOrder ? { ...option, order: maxOrder + index + 1 } : option,
    );

    await genreTaxonomyBase.save([...options, ...additions]);
    await LocalStorage.setItem(GENRE_SEED_KEY, "true");
    return genreTaxonomyBase.get();
  },

  save: genreTaxonomyBase.save,

  async reset() {
    await genreTaxonomyBase.save([]);
    await LocalStorage.setItem(GENRE_SEED_KEY, "false");
  },
};

export const collectionTaxonomy = createTaxonomy("collection-options", []);
// Track Role：有序，默认取现有预设（Intro/Skit/Interlude/Outro），用户可增删改。
export const ROLE_DEFAULTS: TaxonomyOption[] = TRACK_ROLES.map((name, index) => ({
  id: name.toLowerCase(),
  name,
  order: index + 1,
}));
export const roleTaxonomy = createTaxonomy("role-options", ROLE_DEFAULTS);
