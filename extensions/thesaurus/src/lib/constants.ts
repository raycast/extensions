const constants = {
  merriamClasses: {
    posContainer: ".parts-of-speech",
    asInWordContainer: ".as-in-word",
    synonymList: ".sim-list-scored",
    antonymList: ".opp-list-scored",
    spellingSuggestion: ".spelling-suggestion",
  },
  merriamIds: {
    // The first num corresponds to the pos, the second to the entry
    // thesaurus-entry-1-1, thesaurus-entry-1-2, thesaurus-entry-2-1, etc.
    partialEntryContainer: '[id^="thesaurus-entry-"]',
  },
  links: {
    thesaurus: "https://www.merriam-webster.com/thesaurus/",
    dictionary: "https://www.merriam-webster.com/dictionary/",
  },
  wordStrength: {
    1: "#d1d5db",
    2: "#6b7280",
    3: "#374151",
    4: "#16a34a",
  },
};

export default constants;
