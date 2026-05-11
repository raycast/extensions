import type { SpecEntry } from "../types";

export const specs: SpecEntry[] = [
  // Death Knight
  {
    slug: "blood-death-knight",
    pveRole: "tank",
    aliases: ["blood death knight", "blood dk", "bdk"],
  },
  {
    slug: "frost-death-knight",
    pveRole: "dps",
    aliases: ["frost death knight", "frost dk", "fdk"],
  },
  {
    slug: "unholy-death-knight",
    pveRole: "dps",
    aliases: ["unholy death knight", "unholy dk", "uh dk", "uhdk"],
  },
  // Demon Hunter
  {
    slug: "devourer-demon-hunter",
    pveRole: "dps",
    aliases: ["devourer demon hunter", "devourer dh", "devourer"],
  },
  {
    slug: "havoc-demon-hunter",
    pveRole: "dps",
    aliases: ["havoc demon hunter", "havoc dh", "havoc"],
  },
  {
    slug: "vengeance-demon-hunter",
    pveRole: "tank",
    aliases: ["vengeance demon hunter", "vengeance dh", "vdh"],
  },
  // Druid
  {
    slug: "balance-druid",
    pveRole: "dps",
    aliases: ["balance druid", "balance", "boomkin", "boomy", "bala"],
  },
  {
    slug: "feral-druid",
    pveRole: "dps",
    aliases: ["feral druid", "feral", "cat druid"],
  },
  {
    slug: "guardian-druid",
    pveRole: "tank",
    aliases: ["guardian druid", "guardian", "bear druid"],
  },
  {
    slug: "restoration-druid",
    pveRole: "healer",
    aliases: ["restoration druid", "resto druid", "rdru"],
  },
  // Evoker
  {
    slug: "devastation-evoker",
    pveRole: "dps",
    aliases: ["devastation evoker", "devastation", "dev evoker", "dev"],
  },
  {
    slug: "preservation-evoker",
    pveRole: "healer",
    aliases: ["preservation evoker", "preservation", "pres evoker", "pres"],
  },
  {
    slug: "augmentation-evoker",
    pveRole: "dps",
    aliases: ["augmentation evoker", "augmentation", "aug evoker", "aug"],
  },
  // Hunter
  {
    slug: "beast-mastery-hunter",
    pveRole: "dps",
    aliases: ["beast mastery hunter", "beast mastery", "bm hunter", "bm"],
    urlSuffixOverrides: { "spec-builds-talents": "spec-builds-pet-talents" },
  },
  {
    slug: "marksmanship-hunter",
    pveRole: "dps",
    aliases: ["marksmanship hunter", "marksmanship", "mm hunter", "mm"],
    urlSuffixOverrides: { "spec-builds-talents": "spec-builds-pet-talents" },
  },
  {
    slug: "survival-hunter",
    pveRole: "dps",
    aliases: ["survival hunter", "survival", "surv"],
    urlSuffixOverrides: { "spec-builds-talents": "spec-builds-pet-talents" },
  },
  // Mage
  {
    slug: "arcane-mage",
    pveRole: "dps",
    aliases: ["arcane mage", "arcane"],
  },
  {
    slug: "fire-mage",
    pveRole: "dps",
    aliases: ["fire mage", "fire"],
  },
  {
    slug: "frost-mage",
    pveRole: "dps",
    aliases: ["frost mage", "frost mag", "fmage"],
  },
  // Monk
  {
    slug: "brewmaster-monk",
    pveRole: "tank",
    aliases: ["brewmaster monk", "brewmaster", "brew monk", "brew"],
  },
  {
    slug: "mistweaver-monk",
    pveRole: "healer",
    aliases: ["mistweaver monk", "mistweaver", "mw monk", "mw"],
  },
  {
    slug: "windwalker-monk",
    pveRole: "dps",
    aliases: ["windwalker monk", "windwalker", "ww monk", "ww"],
  },
  // Paladin
  {
    slug: "holy-paladin",
    pveRole: "healer",
    aliases: ["holy paladin", "holy pala", "hpal"],
  },
  {
    slug: "protection-paladin",
    pveRole: "tank",
    aliases: ["protection paladin", "prot paladin", "prot pala"],
  },
  {
    slug: "retribution-paladin",
    pveRole: "dps",
    aliases: [
      "retribution paladin",
      "retribution",
      "ret paladin",
      "ret pala",
      "ret",
    ],
  },
  // Priest
  {
    slug: "discipline-priest",
    pveRole: "healer",
    aliases: ["discipline priest", "discipline", "disc priest", "disc"],
  },
  {
    slug: "holy-priest",
    pveRole: "healer",
    aliases: ["holy priest", "hpriest"],
  },
  {
    slug: "shadow-priest",
    pveRole: "dps",
    aliases: ["shadow priest", "sp"],
  },
  // Rogue
  {
    slug: "assassination-rogue",
    pveRole: "dps",
    aliases: ["assassination rogue", "assassination", "sin rogue", "sin"],
  },
  {
    slug: "outlaw-rogue",
    pveRole: "dps",
    aliases: ["outlaw rogue", "outlaw"],
  },
  {
    slug: "subtlety-rogue",
    pveRole: "dps",
    aliases: ["subtlety rogue", "subtlety", "sub rogue", "sub"],
  },
  // Shaman
  {
    slug: "elemental-shaman",
    pveRole: "dps",
    aliases: ["elemental shaman", "elemental", "ele shaman", "ele"],
  },
  {
    slug: "enhancement-shaman",
    pveRole: "dps",
    aliases: ["enhancement shaman", "enhancement", "enh shaman", "enh"],
  },
  {
    slug: "restoration-shaman",
    pveRole: "healer",
    aliases: ["restoration shaman", "resto shaman", "rsham"],
  },
  // Warlock
  {
    slug: "affliction-warlock",
    pveRole: "dps",
    aliases: ["affliction warlock", "affliction", "affli warlock", "affli"],
  },
  {
    slug: "demonology-warlock",
    pveRole: "dps",
    aliases: ["demonology warlock", "demonology", "demo warlock", "demo"],
  },
  {
    slug: "destruction-warlock",
    pveRole: "dps",
    aliases: ["destruction warlock", "destruction", "destro warlock", "destro"],
  },
  // Warrior
  {
    slug: "arms-warrior",
    pveRole: "dps",
    aliases: ["arms warrior", "arms"],
  },
  {
    slug: "fury-warrior",
    pveRole: "dps",
    aliases: ["fury warrior", "fury"],
  },
  {
    slug: "protection-warrior",
    pveRole: "tank",
    aliases: ["protection warrior", "prot warrior", "prot war"],
  },
];
