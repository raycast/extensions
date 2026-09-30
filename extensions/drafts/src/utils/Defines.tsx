export const CallbackBaseUrls = {
  CREATE_DRAFT: "drafts://x-callback-url/create?",
  OPEN_DRAFT: "drafts://x-callback-url/open?",
  RUN_ACTION: "drafts://x-callback-url/runAction?",
  OPEN_WORKSPACE: "drafts://x-callback-url/workspace?",
  APPEND_TO_DRAFT: "drafts://x-callback-url/append?",
  PREPEND_TO_DRAFT: "drafts://x-callback-url/prepend?",
  DICTATE: "drafts://x-callback-url/dictate?",
};

export const AppBaseUrls = {
  CREATE_DRAFT: "drafts://create?",
  OPEN_DRAFT: "drafts://open?",
  RUN_ACTION: "drafts://runAction?",
  OPEN_WORKSPACE: "drafts://workspace?",
  APPEND_TO_DRAFT: "drafts://append?",
  PREPEND_TO_DRAFT: "drafts://prepend?",
  DICTATE: "drafts://dictate?",
};

export const AppInstallCheckDefines = {
  APP_NAME: "Drafts",
  APP_BUNDLE_ID: "com.agiletortoise.Drafts-OSX",
  APP_DOWNLOAD_LINK: "https://getdrafts.com",
};

type QuickLinkDefinition = {
  name: string;
  buttonDescription: string;
  mdDescription: string;
  link: string;
};

export const StorageDefines = {
  RECENT_TAGS: "recent_tags",
  RECENT_TAGS_MAX: 10,
};

export const QuicklinkDefinitions: QuickLinkDefinition[] = [
  {
    name: "CREATE_DRAFT",
    buttonDescription: "Create Draft",
    mdDescription: "create a draft",
    link: "drafts://x-callback-url/create?text={Content}",
  },
  {
    name: "QUICK_SEARCH",
    buttonDescription: "Quick Search",
    mdDescription: "open the quicksearch in Drafts",
    link: "drafts://x-callback-url/quickSearch?query={Quicksearch}",
  },
  {
    name: "DRAFTS_LIST_SEARCH",
    buttonDescription: "Search Drafts List",
    mdDescription: "search in the drafts list",
    link: "drafts://x-callback-url/search?query={Search Drafts}",
  },
  {
    name: "ACTION_LIST_SEARCH",
    buttonDescription: "Search Actions List",
    mdDescription: "search in the Action list",
    link: "drafts://x-callback-url/actionSearch?query={Search Actions}",
  },
  {
    name: "CAPTURE",
    buttonDescription: "Capture Text",
    mdDescription: "capture text with Drafts capture window",
    link: "drafts://x-callback-url/capture?text={Text}",
  },
  {
    name: "DICTATE",
    buttonDescription: "Dictate to Drafts",
    mdDescription: "open the dictation window",
    link: "drafts://x-callback-url/dictate?",
  },
];

export const DataBasePath = "~/Library/Group Containers/GTFQ98J4YG.com.agiletortoise.Drafts/DraftStore.sqlite";
