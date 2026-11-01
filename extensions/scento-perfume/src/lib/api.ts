// Scento Perfume API client: keyless, read-only. Docs: https://www.scento.com/developers
export const API_BASE = "https://www.scento.com/api/perfume/v1";

type Page = { label: string; url: string };

interface Folio<D> {
  folio: string;
  lede: string;
  detail: D;
  scento_page: Page;
  further_reading: Page[];
  cite: string;
  continuation: string | null;
}

export interface PerfumeMatch {
  name: string;
  house: string;
  family: string | null;
  page: string;
}

export interface Portrait {
  name: string;
  house: string;
  year: number | null;
  concentration: string | null;
  family: string | null;
  subfamily: string | null;
  pyramid: { top: string[]; heart: string[]; base: string[] } | null;
  notes: string[];
  character: string | null;
  characterWords: string[];
  seasons: string[];
  hours: string[];
  signatureMaterials: string[];
  lede: string;
  url: string;
}

export interface Neighbour extends PerfumeMatch {
  shared: string[];
  difference: string | null;
}

export interface Family {
  id: string;
  name: string;
  definition: string;
  subfamilies: string[];
  perfumeCount: number;
}

export interface FamilyDetail extends Family {
  exemplars: { name: string; house: string; page: string }[];
  neighbouringFamilies: string[];
  url: string;
}

export interface Material {
  name: string;
  aliases: string[];
  naturalOrSynthetic: string | null;
  origin: string | null;
  smellsLike: string | null;
  family: string | null;
  scentoFamily: string | null;
  pairsWellWith: string[];
  showcasedIn: { name: string; house: string; page: string; tier: string }[];
  lede: string;
  url: string;
}

export interface MaterialMatch {
  name: string;
  family: string | null;
  page: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  cursor: string | null;
}

export class NotFoundError extends Error {}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export async function request(path: string, params: Record<string, string | undefined> = {}): Promise<Folio<Raw>> {
  const url = new URL(`${API_BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, value);
  }
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const body = (await response.json().catch(() => null)) as Raw;
  if (!response.ok) {
    throw new Error(body?.error?.message ?? `Scento Perfume API returned ${response.status}`);
  }
  return body as Folio<Raw>;
}

export function mapMatch(m: Raw): PerfumeMatch {
  return { name: m.name, house: m.house ?? "", family: str(m.family), page: m.page };
}

export function mapSearch(folio: Folio<Raw>): Paged<PerfumeMatch> {
  const matches: Raw[] = folio.detail.matches ?? [];
  return {
    items: matches.filter((m) => m.kind === "perfume" || m.kind === undefined).map(mapMatch),
    total: folio.detail.total ?? matches.length,
    cursor: folio.continuation,
  };
}

export function mapPortrait(folio: Folio<Raw>): Portrait {
  const d = folio.detail;
  if (d.found === false) throw new NotFoundError(folio.lede);
  const pyramid = d.pyramid
    ? { top: strs(d.pyramid.top), heart: strs(d.pyramid.heart), base: strs(d.pyramid.base) }
    : null;
  return {
    name: d.name,
    house: d.house ?? "",
    year: typeof d.year === "number" ? d.year : null,
    concentration: str(d.concentration),
    family: str(d.family),
    subfamily: str(d.subfamily),
    pyramid,
    notes: strs(d.notes),
    character: str(d.character),
    characterWords: strs(d.character_words),
    seasons: strs(d.wears?.seasons),
    hours: strs(d.wears?.hours),
    signatureMaterials: strs(d.signature_materials),
    lede: folio.lede,
    url: folio.scento_page.url,
  };
}

export function mapNeighbours(folio: Folio<Raw>): Paged<Neighbour> {
  const d = folio.detail;
  if (d.found === false) throw new NotFoundError(folio.lede);
  const list: Raw[] = d.neighbours ?? [];
  return {
    items: list.map((n) => ({ ...mapMatch(n), shared: strs(n.shared), difference: str(n.difference) })),
    total: d.total ?? list.length,
    cursor: folio.continuation,
  };
}

export function mapFamilies(folio: Folio<Raw>): Family[] {
  const tree: Raw[] = folio.detail.tree ?? [];
  return tree.map((f) => ({
    id: f.id,
    name: f.name,
    definition: f.definition ?? "",
    subfamilies: strs(f.subfamilies),
    perfumeCount: f.perfumes ?? 0,
  }));
}

export function mapFamilyDetail(folio: Folio<Raw>): FamilyDetail {
  const d = folio.detail;
  if (d.found === false) throw new NotFoundError(folio.lede);
  return {
    id: d.id,
    name: d.family,
    definition: d.definition ?? "",
    subfamilies: strs(d.subfamilies),
    perfumeCount: d.perfumes ?? 0,
    exemplars: (d.exemplars ?? []).map((e: Raw) => ({ name: e.name, house: e.house ?? "", page: e.page })),
    neighbouringFamilies: strs(d.neighbouring_families),
    url: folio.scento_page.url,
  };
}

export function mapMaterial(folio: Folio<Raw>): Material {
  const d = folio.detail;
  if (d.found === false) throw new NotFoundError(folio.lede);
  return {
    name: d.name,
    aliases: strs(d.aliases),
    naturalOrSynthetic: str(d.natural_or_synthetic),
    origin: str(d.origin),
    smellsLike: str(d.smells_like),
    family: str(d.family),
    scentoFamily: str(d.scento_family),
    pairsWellWith: strs(d.pairs_well_with),
    showcasedIn: (d.showcased_in ?? []).map((s: Raw) => ({
      name: s.name,
      house: s.house ?? "",
      page: s.page,
      tier: s.tier ?? "listed",
    })),
    lede: folio.lede,
    url: folio.scento_page.url,
  };
}

export function mapMaterialSearch(folio: Folio<Raw>): MaterialMatch[] {
  const matches: Raw[] = folio.detail.matches ?? [];
  return matches
    .filter((m) => m.kind === "material")
    .map((m) => ({ name: m.name, family: str(m.family), page: m.page }));
}

export async function searchPerfumes(query: string, cursor?: string): Promise<Paged<PerfumeMatch>> {
  return mapSearch(await request("perfumes", { q: query, continuation: cursor }));
}

// The portrait and neighbours routes resolve "<name> <house>", which keeps same-named perfumes apart.
const idFor = (p: { name: string; house: string }) => `${p.name} ${p.house}`.trim();

export async function getPortrait(p: { name: string; house: string }): Promise<Portrait> {
  return mapPortrait(await request(`perfumes/${encodeURIComponent(idFor(p))}`));
}

export async function getNeighbours(p: { name: string; house: string }, cursor?: string): Promise<Paged<Neighbour>> {
  return mapNeighbours(await request(`perfumes/${encodeURIComponent(idFor(p))}/neighbours`, { continuation: cursor }));
}

export async function listFamilies(): Promise<Family[]> {
  return mapFamilies(await request("families"));
}

export async function getFamily(id: string): Promise<FamilyDetail> {
  return mapFamilyDetail(await request(`families/${encodeURIComponent(id)}`));
}

export async function searchNotes(query: string): Promise<MaterialMatch[]> {
  return mapMaterialSearch(await request("search", { q: query, kind: "material" }));
}

export async function getMaterial(name: string): Promise<Material> {
  return mapMaterial(await request(`materials/${encodeURIComponent(name)}`));
}
