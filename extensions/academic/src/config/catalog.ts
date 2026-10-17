import type { FileFormat } from "../types";

export type Option = { id: string; title: string; description?: string };

export const BOOK_SOURCES: Option[] = [
  {
    id: "open-library",
    title: "Open Library",
    description: "Books, editions, covers and borrowing",
  },
  {
    id: "google-books",
    title: "Google Books",
    description: "Book metadata, previews and authorized files",
  },
  {
    id: "internet-archive",
    title: "Internet Archive",
    description: "Public and borrowable texts",
  },
  {
    id: "project-gutenberg",
    title: "Project Gutenberg",
    description: "Public-domain ebooks",
  },
  {
    id: "doab-external",
    title: "Directory of Open Access Books",
    description: "External catalog search",
  },
  {
    id: "oapen-external",
    title: "OAPEN Library",
    description: "External catalog search",
  },
  {
    id: "hathitrust-external",
    title: "HathiTrust",
    description: "External catalog search",
  },
  {
    id: "worldcat-external",
    title: "WorldCat",
    description: "Library holdings and catalog search",
  },
];

export const ARTICLE_SOURCES: Option[] = [
  { id: "crossref", title: "Crossref" },
  { id: "openalex", title: "OpenAlex" },
  {
    id: "semantic-scholar",
    title: "Semantic Scholar",
    description: "Requires a Semantic Scholar API key",
  },
  { id: "europe-pmc", title: "Europe PMC" },
  { id: "arxiv", title: "arXiv" },
  { id: "doaj", title: "DOAJ" },
  { id: "pubmed-central", title: "PubMed Central" },
  { id: "unpaywall", title: "Unpaywall" },
  { id: "core", title: "CORE" },
  { id: "zenodo", title: "Zenodo" },
  {
    id: "google-scholar-external",
    title: "Google Scholar",
    description: "External browser search; no automated scraping",
  },
  {
    id: "philpapers-external",
    title: "PhilPapers",
    description: "Philosophy bibliography and available copies",
  },
  {
    id: "ssrn-external",
    title: "SSRN",
    description: "External working-paper search",
  },
  {
    id: "repec-external",
    title: "RePEc / IDEAS",
    description: "Economics bibliography search",
  },
];

export const SHARED_SOURCES: Option[] = [
  {
    id: "catalog-mirrors",
    title: "Shadow-library Catalogs",
    description:
      "Book and article record pages only; never direct download links",
  },
];

export const METADATA_SOURCES: Option[] = [
  ...BOOK_SOURCES.filter(
    (source) =>
      !source.id.endsWith("-external") && source.id !== "catalog-mirrors",
  ),
  ...ARTICLE_SOURCES.filter(
    (source) =>
      !source.id.endsWith("-external") && source.id !== "catalog-mirrors",
  ),
  {
    id: "amazon-metadata",
    title: "Amazon Product Page",
    description:
      "Metadata from a pasted Amazon product link or ISBN when available",
  },
].filter(
  (source, index, values) =>
    values.findIndex((candidate) => candidate.id === source.id) === index,
);

export const ENCYCLOPEDIA_SOURCES: Option[] = [
  { id: "sep", title: "Stanford Encyclopedia of Philosophy" },
  { id: "iep", title: "Internet Encyclopedia of Philosophy" },
  { id: "eom", title: "Encyclopedia of Mathematics" },
  {
    id: "scholarpedia",
    title: "Scholarpedia",
    description: "External search when its API is unavailable",
  },
  {
    id: "ncbi-bookshelf",
    title: "NCBI Bookshelf",
    description: "Life sciences and healthcare reference works",
  },
  {
    id: "eol",
    title: "Encyclopedia of Life",
    description: "External biodiversity search",
  },
];

export const LANGUAGES: Option[] = [
  ["pt", "Portuguese"],
  ["en", "English"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["it", "Italian"],
  ["de", "German"],
  ["nl", "Dutch"],
  ["pl", "Polish"],
  ["ru", "Russian"],
  ["uk", "Ukrainian"],
  ["el", "Greek"],
  ["la", "Latin"],
  ["ar", "Arabic"],
  ["he", "Hebrew"],
  ["fa", "Persian"],
  ["hi", "Hindi"],
  ["zh", "Chinese"],
  ["ja", "Japanese"],
  ["ko", "Korean"],
  ["id", "Indonesian"],
  ["tr", "Turkish"],
  ["af", "Afrikaans"],
  ["sw", "Swahili"],
  ["mi", "Māori"],
].map(([id, title]) => ({ id, title }));

export type Country = Option & {
  continent: string;
  languages: string[];
  marketplaces: Marketplace[];
};
export type Marketplace = {
  name: string;
  searchUrl: (query: string) => string;
};
export function marketplaceId(
  countryId: string,
  marketplaceName: string,
): string {
  return `${countryId}:${marketplaceName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

const queryUrl = (base: string, parameter: string) => (query: string) =>
  `${base}${base.includes("?") ? "&" : "?"}${parameter}=${encodeURIComponent(query)}`;
const pathUrl = (base: string) => (query: string) =>
  `${base}${encodeURIComponent(query)}`;
const amazon = (domain: string) => ({
  name: "Amazon",
  searchUrl: queryUrl(`https://www.amazon.${domain}/s`, "k"),
});

export const COUNTRIES: Country[] = [
  {
    id: "br",
    title: "Brazil",
    continent: "South America",
    languages: ["pt"],
    marketplaces: [
      amazon("com.br"),
      {
        name: "Estante Virtual",
        searchUrl: queryUrl("https://www.estantevirtual.com.br/busca", "q"),
      },
      {
        name: "Livraria da Travessa",
        searchUrl: queryUrl("https://www.travessa.com.br/Busca.aspx", "d"),
      },
    ],
  },
  {
    id: "ar",
    title: "Argentina",
    continent: "South America",
    languages: ["es"],
    marketplaces: [
      {
        name: "Buscalibre Argentina",
        searchUrl: queryUrl("https://www.buscalibre.com.ar/libros/search", "q"),
      },
      {
        name: "Mercado Libre Argentina",
        searchUrl: pathUrl("https://listado.mercadolibre.com.ar/"),
      },
    ],
  },
  {
    id: "cl",
    title: "Chile",
    continent: "South America",
    languages: ["es"],
    marketplaces: [
      {
        name: "Buscalibre Chile",
        searchUrl: queryUrl("https://www.buscalibre.cl/libros/search", "q"),
      },
      {
        name: "Mercado Libre Chile",
        searchUrl: pathUrl("https://listado.mercadolibre.cl/"),
      },
    ],
  },
  {
    id: "co",
    title: "Colombia",
    continent: "South America",
    languages: ["es"],
    marketplaces: [
      {
        name: "Buscalibre Colombia",
        searchUrl: queryUrl("https://www.buscalibre.com.co/libros/search", "q"),
      },
      {
        name: "Panamericana",
        searchUrl: queryUrl(
          "https://www.panamericana.com.co/catalogsearch/result/",
          "q",
        ),
      },
    ],
  },
  {
    id: "us",
    title: "United States",
    continent: "North America",
    languages: ["en"],
    marketplaces: [
      amazon("com"),
      {
        name: "Barnes & Noble",
        searchUrl: queryUrl("https://www.barnesandnoble.com/s/", "keyword"),
      },
      {
        name: "Bookshop.org",
        searchUrl: queryUrl("https://bookshop.org/search", "keywords"),
      },
    ],
  },
  {
    id: "ca",
    title: "Canada",
    continent: "North America",
    languages: ["en", "fr"],
    marketplaces: [
      amazon("ca"),
      {
        name: "Indigo",
        searchUrl: queryUrl("https://www.indigo.ca/en-ca/search", "q"),
      },
    ],
  },
  {
    id: "mx",
    title: "Mexico",
    continent: "North America",
    languages: ["es"],
    marketplaces: [
      amazon("com.mx"),
      {
        name: "Gandhi",
        searchUrl: queryUrl(
          "https://www.gandhi.com.mx/catalogsearch/result/",
          "q",
        ),
      },
      {
        name: "Buscalibre Mexico",
        searchUrl: queryUrl("https://www.buscalibre.com.mx/libros/search", "q"),
      },
    ],
  },
  {
    id: "pt",
    title: "Portugal",
    continent: "Europe",
    languages: ["pt"],
    marketplaces: [
      {
        name: "Wook",
        searchUrl: queryUrl("https://www.wook.pt/pesquisa", "q"),
      },
      {
        name: "Bertrand",
        searchUrl: queryUrl("https://www.bertrand.pt/pesquisa/", "query"),
      },
      {
        name: "FNAC Portugal",
        searchUrl: queryUrl(
          "https://www.fnac.pt/SearchResult/ResultList.aspx",
          "Search",
        ),
      },
    ],
  },
  {
    id: "gb",
    title: "United Kingdom",
    continent: "Europe",
    languages: ["en"],
    marketplaces: [
      amazon("co.uk"),
      {
        name: "Waterstones",
        searchUrl: queryUrl(
          "https://www.waterstones.com/books/search/term/",
          "term",
        ),
      },
      {
        name: "Blackwell's",
        searchUrl: queryUrl(
          "https://blackwells.co.uk/bookshop/search/",
          "keyword",
        ),
      },
    ],
  },
  {
    id: "es",
    title: "Spain",
    continent: "Europe",
    languages: ["es"],
    marketplaces: [
      amazon("es"),
      {
        name: "Casa del Libro",
        searchUrl: queryUrl(
          "https://www.casadellibro.com/busqueda-generica",
          "query",
        ),
      },
      {
        name: "FNAC Spain",
        searchUrl: queryUrl(
          "https://www.fnac.es/SearchResult/ResultList.aspx",
          "Search",
        ),
      },
    ],
  },
  {
    id: "fr",
    title: "France",
    continent: "Europe",
    languages: ["fr"],
    marketplaces: [
      amazon("fr"),
      {
        name: "FNAC France",
        searchUrl: queryUrl(
          "https://www.fnac.com/SearchResult/ResultList.aspx",
          "Search",
        ),
      },
      {
        name: "Decitre",
        searchUrl: queryUrl("https://www.decitre.fr/rechercher/result", "q"),
      },
    ],
  },
  {
    id: "de",
    title: "Germany",
    continent: "Europe",
    languages: ["de"],
    marketplaces: [
      amazon("de"),
      {
        name: "Thalia",
        searchUrl: queryUrl("https://www.thalia.de/suche", "filterPATH"),
      },
      {
        name: "Hugendubel",
        searchUrl: queryUrl("https://www.hugendubel.de/de/search", "q"),
      },
    ],
  },
  {
    id: "it",
    title: "Italy",
    continent: "Europe",
    languages: ["it"],
    marketplaces: [
      amazon("it"),
      {
        name: "IBS",
        searchUrl: queryUrl("https://www.ibs.it/search/", "query"),
      },
      {
        name: "Feltrinelli",
        searchUrl: queryUrl("https://www.lafeltrinelli.it/search/", "query"),
      },
    ],
  },
  {
    id: "nl",
    title: "Netherlands",
    continent: "Europe",
    languages: ["nl", "en"],
    marketplaces: [
      {
        name: "bol.com",
        searchUrl: queryUrl("https://www.bol.com/nl/nl/s/", "searchtext"),
      },
      {
        name: "Athenaeum",
        searchUrl: queryUrl("https://www.athenaeum.nl/zoek", "q"),
      },
    ],
  },
  {
    id: "in",
    title: "India",
    continent: "Asia",
    languages: ["en", "hi"],
    marketplaces: [
      amazon("in"),
      {
        name: "Flipkart",
        searchUrl: queryUrl("https://www.flipkart.com/search", "q"),
      },
      {
        name: "SapnaOnline",
        searchUrl: queryUrl("https://www.sapnaonline.com/search", "keyword"),
      },
    ],
  },
  {
    id: "cn",
    title: "China",
    continent: "Asia",
    languages: ["zh"],
    marketplaces: [
      {
        name: "JD Books",
        searchUrl: queryUrl("https://search.jd.com/Search", "keyword"),
      },
      {
        name: "Dangdang",
        searchUrl: queryUrl("http://search.dangdang.com/", "key"),
      },
    ],
  },
  {
    id: "jp",
    title: "Japan",
    continent: "Asia",
    languages: ["ja", "en"],
    marketplaces: [
      amazon("co.jp"),
      {
        name: "Rakuten Books",
        searchUrl: queryUrl("https://books.rakuten.co.jp/search", "g"),
      },
      {
        name: "Kinokuniya Japan",
        searchUrl: queryUrl("https://www.kinokuniya.co.jp/f/dsg-01-", "q"),
      },
    ],
  },
  {
    id: "kr",
    title: "South Korea",
    continent: "Asia",
    languages: ["ko"],
    marketplaces: [
      {
        name: "Kyobo",
        searchUrl: queryUrl("https://search.kyobobook.co.kr/search", "keyword"),
      },
      {
        name: "Aladin",
        searchUrl: queryUrl(
          "https://www.aladin.co.kr/search/wsearchresult.aspx",
          "SearchWord",
        ),
      },
      {
        name: "YES24",
        searchUrl: queryUrl("https://www.yes24.com/Product/Search", "domain"),
      },
    ],
  },
  {
    id: "sg",
    title: "Singapore",
    continent: "Asia",
    languages: ["en", "zh"],
    marketplaces: [
      amazon("sg"),
      {
        name: "Kinokuniya Singapore",
        searchUrl: queryUrl(
          "https://singapore.kinokuniya.com/products",
          "is_searching",
        ),
      },
    ],
  },
  {
    id: "id",
    title: "Indonesia",
    continent: "Asia",
    languages: ["id"],
    marketplaces: [
      {
        name: "Gramedia",
        searchUrl: queryUrl("https://www.gramedia.com/search", "query"),
      },
      {
        name: "Tokopedia",
        searchUrl: queryUrl("https://www.tokopedia.com/search", "q"),
      },
    ],
  },
  {
    id: "za",
    title: "South Africa",
    continent: "Africa",
    languages: ["en", "af"],
    marketplaces: [
      {
        name: "Exclusive Books",
        searchUrl: queryUrl("https://exclusivebooks.co.za/search", "q"),
      },
      {
        name: "Takealot",
        searchUrl: queryUrl("https://www.takealot.com/all", "qsearch"),
      },
    ],
  },
  {
    id: "eg",
    title: "Egypt",
    continent: "Africa",
    languages: ["ar", "en"],
    marketplaces: [
      amazon("eg"),
      {
        name: "Diwan",
        searchUrl: queryUrl("https://diwanegypt.com/product-search", "search"),
      },
    ],
  },
  {
    id: "ng",
    title: "Nigeria",
    continent: "Africa",
    languages: ["en"],
    marketplaces: [
      {
        name: "Roving Heights",
        searchUrl: queryUrl("https://rhbooks.com.ng/search", "q"),
      },
      {
        name: "Laterna",
        searchUrl: queryUrl("https://laterna.com.ng/search", "q"),
      },
    ],
  },
  {
    id: "ke",
    title: "Kenya",
    continent: "Africa",
    languages: ["en", "sw"],
    marketplaces: [
      {
        name: "Text Book Centre",
        searchUrl: queryUrl("https://textbookcentre.com/search/", "q"),
      },
      {
        name: "Nuria",
        searchUrl: queryUrl("https://nuriakenya.com/search", "q"),
      },
    ],
  },
  {
    id: "ma",
    title: "Morocco",
    continent: "Africa",
    languages: ["ar", "fr"],
    marketplaces: [
      {
        name: "Livremoi",
        searchUrl: queryUrl("https://livremoi.ma/search", "q"),
      },
      {
        name: "Librairies du Maroc",
        searchUrl: queryUrl("https://librairiesdumaroc.com/search", "q"),
      },
    ],
  },
  {
    id: "au",
    title: "Australia",
    continent: "Oceania",
    languages: ["en"],
    marketplaces: [
      amazon("com.au"),
      {
        name: "Booktopia",
        searchUrl: queryUrl(
          "https://www.booktopia.com.au/search.ep",
          "keywords",
        ),
      },
      {
        name: "Dymocks",
        searchUrl: queryUrl("https://www.dymocks.com.au/search", "q"),
      },
    ],
  },
  {
    id: "nz",
    title: "New Zealand",
    continent: "Oceania",
    languages: ["en", "mi"],
    marketplaces: [
      {
        name: "Mighty Ape",
        searchUrl: queryUrl("https://www.mightyape.co.nz/search", "i"),
      },
      {
        name: "Whitcoulls",
        searchUrl: queryUrl("https://www.whitcoulls.co.nz/search", "q"),
      },
      {
        name: "Unity Books",
        searchUrl: queryUrl("https://unitybooks.nz/search", "q"),
      },
    ],
  },
  {
    id: "fj",
    title: "Fiji",
    continent: "Oceania",
    languages: ["en", "hi"],
    marketplaces: [
      {
        name: "USP Book Centre",
        searchUrl: queryUrl("https://bookcentre.usp.ac.fj/search", "q"),
      },
      {
        name: "Google Books",
        searchUrl: queryUrl("https://books.google.com/books", "q"),
      },
    ],
  },
];

export const FILE_FORMATS: Array<Option & { id: FileFormat }> = [
  { id: "pdf", title: "PDF" },
  { id: "tex", title: "TeX / LaTeX source" },
  { id: "doc", title: "Microsoft Word (DOC / DOCX)" },
  { id: "txt", title: "Plain text (TXT)" },
  { id: "epub", title: "EPUB" },
  { id: "html", title: "HTML / online reader" },
  { id: "djvu", title: "DjVu" },
  { id: "rtf", title: "RTF" },
  { id: "xml", title: "XML / JATS" },
  { id: "mobi", title: "MOBI / AZW" },
  { id: "unknown", title: "Unknown file format" },
];

export const ALL_SOURCE_OPTIONS = [
  ...BOOK_SOURCES,
  ...ARTICLE_SOURCES,
  ...SHARED_SOURCES,
].filter(
  (source, index, values) =>
    values.findIndex((candidate) => candidate.id === source.id) === index,
);
export const DEFAULT_BOOK_SOURCE_IDS = [
  "open-library",
  "internet-archive",
  "project-gutenberg",
];
export const DEFAULT_ARTICLE_SOURCE_IDS = [
  "crossref",
  "openalex",
  "europe-pmc",
  "arxiv",
  "doaj",
  "pubmed-central",
  "core",
  "zenodo",
];
export const DEFAULT_SOURCE_IDS = [
  ...DEFAULT_BOOK_SOURCE_IDS,
  ...DEFAULT_ARTICLE_SOURCE_IDS,
];
export const DEFAULT_METADATA_SOURCE_IDS = [
  "open-library",
  "internet-archive",
  "crossref",
  "openalex",
  "europe-pmc",
  "arxiv",
  "doaj",
  "pubmed-central",
];
export const BASIC_ENCYCLOPEDIA_IDS = ["sep", "iep", "eom", "ncbi-bookshelf"];
export const DEFAULT_ENCYCLOPEDIA_IDS: string[] = [];
export const DEFAULT_LANGUAGE_IDS = ["pt", "en"];
export const DEFAULT_COUNTRY_IDS: string[] = [];
export const DEFAULT_MARKETPLACE_IDS: string[] = [];
export const DEFAULT_FORMAT_IDS: FileFormat[] = ["pdf", "tex", "doc", "txt"];
