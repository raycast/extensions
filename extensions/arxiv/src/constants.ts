// API Configuration
export const ARXIV_API_BASE_URL = "https://export.arxiv.org/api/query";
export const MAX_SEARCH_RESULTS = 30;
export const MIN_SEARCH_LENGTH = 1;

// UI Configuration
export const MAX_VENUE_NAME_LENGTH = 50;
export const MAX_PAGE_COUNT = 1000;
export const MIN_PAGE_COUNT = 1;

// Citation Formatting
export const MAX_AUTHORS_APA = 20;
export const MAX_AUTHORS_APA_DISPLAY = 19;
export const MAX_AUTHORS_CHICAGO = 10;
export const MAX_AUTHORS_TURABIAN = 10;
export const MAX_AUTHORS_IEEE = 6;
export const MAX_AUTHORS_IEEE_DISPLAY = 3;
export const MAX_AUTHORS_ACM_FULL = 3;

// Storage Keys
export const CITATION_STYLE_STORAGE_KEY = "selectedCitationStyle";

// Conference patterns for venue extraction
export const CONFERENCE_PATTERNS = [
  "NeurIPS",
  "ICML",
  "ICLR",
  "CVPR",
  "ECCV",
  "ICCV",
  "ACL",
  "EMNLP",
  "NAACL",
  "AAAI",
  "IJCAI",
  "KDD",
  "WWW",
  "SIGIR",
  "CIKM",
  "RecSys",
  "WSDM",
  "COLING",
];

export const CONFERENCE_REGEX = new RegExp(`(${CONFERENCE_PATTERNS.join("|")})(\\s+\\d{4})?`, "i");
