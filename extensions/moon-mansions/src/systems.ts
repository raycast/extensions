// Compact lookups generated from IbnArbi/client/src/{lib/spiritualGuidance,data/nakshatras,data/chinese-astro}.ts.
// Regenerate — do not hand-edit entries.

export const ARAB_THEMES: Record<number, string> = {
  1: "The First Spark - This mansion carries the quality of pure beginning, like a seed placed in fertile ground. Intentions set now may carry particular potency.",
  2: "Building Foundation - This mansion supports gathering resources and establishing what was begun. Practical steps may settle well here.",
  3: "Expansion and Gratitude - This mansion is traditionally associated with increase and favorable outcomes. The quality supports growth and positive connection.",
  4: "Clearing and Release - This mansion carries energy for clearing what no longer serves. It may support endings that enable new space.",
  5: "Vitality and Care - This mansion is traditionally associated with physical well-being. Matters of health may settle well here.",
  6: "Connection and Affection - This mansion supports bonding and harmony. Relationships may deepen more readily here.",
  7: "Provision and Stewardship - This mansion is traditionally associated with material sustenance. Financial matters may settle well here.",
  8: "Openings and Establishment - This mansion is traditionally associated with favorable outcomes. Matters requiring clarity may settle well here.",
  9: "Agreements and Trust - This mansion supports formal commitments and binding relationships. Agreements may settle well here.",
  10: "Truth in Relationship - This mansion may reveal what is true in relationships. What is real may strengthen; what is not may become visible.",
  11: "Receiving and Gratitude - This mansion is traditionally associated with receiving what has been cultivated. Harvesting efforts may settle well here.",
  12: "Partings and Release - This mansion supports necessary endings and partings. Letting go may settle more gently here.",
  13: "General Goodness - This mansion is traditionally considered benefic. Most matters tend to settle favorably here.",
  14: "Patience and Stillness - This mansion traditionally requires caution and patience. Stillness may serve better than action here.",
  15: "Hidden Knowledge - This mansion is traditionally associated with revealing what is concealed. Research and insight may settle well here.",
  16: "Balance and Justice - This mansion is traditionally associated with fair exchange. Negotiations and balancing may settle well here.",
  17: "Protection and Boundaries - This mansion supports safeguarding what matters. Security and boundaries may settle well here.",
  18: "Alliance and Mutual Support - This mansion supports building alliances and strengthening bonds. Cooperation may settle well here.",
  19: "Rest and Restoration - This mansion is traditionally associated with pause and healing. Rest may be more restorative here.",
  20: "Order and Discipline - This mansion supports bringing order and structure. Training and organizing may settle well here.",
  21: "Transformation and Release - This mansion supports ending what must end. Transformation through conscious release may settle well here.",
  22: "Mending and Making Whole - This mansion is traditionally associated with deep healing. Restoration of what was broken may settle well here.",
  23: "Completion and Finishing - This mansion supports completing what was started. Conclusions may settle well here.",
  24: "Freedom and Liberation - This mansion supports releasing bondage and finding liberation. Breaking free may settle well here.",
  25: "Protection in Hiddenness - This mansion is traditionally associated with hidden protection. Quiet spiritual work may settle well here.",
  26: "Subtlety and Awareness - This mansion requires vigilance. Subtle awareness and protection practices may settle well here.",
  27: "Unity and Gathering - This mansion supports bringing together what belongs together. Community and human connection may settle well here.",
  28: "Completion and Surrender - This mansion marks the cycle's completion. Deep reflection and surrender may settle well here.",
};

export interface NakshatraInfo {
  n: number;
  name: string;
  planet: string;
  deity: string;
  theme: string;
}
export const NAKSHATRAS: NakshatraInfo[] = [
  {
    n: 1,
    name: "Ashwini",
    planet: "Ketu",
    deity: "Ashwini Kumaras",
    theme: "Born of a horse; the horse-woman",
  },
  {
    n: 2,
    name: "Bharani",
    planet: "Venus",
    deity: "Yama",
    theme: "The bearer; she who carries and sustains",
  },
  {
    n: 3,
    name: "Krittika",
    planet: "Sun",
    deity: "Agni",
    theme: "The cutters; the Pleiades star cluster",
  },
  {
    n: 4,
    name: "Rohini",
    planet: "Moon",
    deity: "Brahma",
    theme: "The red one; she who is rising and flourishing",
  },
  {
    n: 5,
    name: "Mrigashira",
    planet: "Mars",
    deity: "Soma",
    theme: "The deer's head; the antelope's brow",
  },
  {
    n: 6,
    name: "Ardra",
    planet: "Rahu",
    deity: "Rudra",
    theme: "The moist one; the fresh and tender",
  },
  {
    n: 7,
    name: "Punarvasu",
    planet: "Jupiter",
    deity: "Aditi",
    theme: "Return of the light; restoration of goods and dwelling",
  },
  {
    n: 8,
    name: "Pushya",
    planet: "Saturn",
    deity: "Brihaspati",
    theme: "The nourisher; the flower in full bloom",
  },
  {
    n: 9,
    name: "Ashlesha",
    planet: "Mercury",
    deity: "Nagas",
    theme: "The embracer; the clinging and entwining one",
  },
  {
    n: 10,
    name: "Magha",
    planet: "Ketu",
    deity: "Pitris",
    theme: "The mighty; the magnificent and great",
  },
  {
    n: 11,
    name: "Purva Phalguni",
    planet: "Venus",
    deity: "Bhaga",
    theme: "The former fig tree; the earlier reddish one",
  },
  {
    n: 12,
    name: "Uttara Phalguni",
    planet: "Sun",
    deity: "Aryaman",
    theme: "The latter fig tree; the later reddish one",
  },
  {
    n: 13,
    name: "Hasta",
    planet: "Moon",
    deity: "Savitar",
    theme: "The hand; the open palm",
  },
  {
    n: 14,
    name: "Chitra",
    planet: "Mars",
    deity: "Tvashtar",
    theme: "The bright and variegated; the distinguished jewel",
  },
  {
    n: 15,
    name: "Swati",
    planet: "Rahu",
    deity: "Vayu",
    theme: "The pure one; the sword; the self-going star",
  },
  {
    n: 16,
    name: "Vishakha",
    planet: "Jupiter",
    deity: "Indra-Agni",
    theme: "The forked branch; the two-branched and divided",
  },
  {
    n: 17,
    name: "Anuradha",
    planet: "Saturn",
    deity: "Mitra",
    theme: "Following Radha; subsequent success and good fortune",
  },
  {
    n: 18,
    name: "Jyeshtha",
    planet: "Mercury",
    deity: "Indra",
    theme: "The eldest; the chief and most senior",
  },
  {
    n: 19,
    name: "Mula",
    planet: "Ketu",
    deity: "Nirriti",
    theme: "The root; the foundation and origin",
  },
  {
    n: 20,
    name: "Purva Ashadha",
    planet: "Venus",
    deity: "Apas",
    theme: "The former invincible one; the earlier undefeated",
  },
  {
    n: 21,
    name: "Uttara Ashadha",
    planet: "Sun",
    deity: "Vishvadevas",
    theme: "The latter invincible one; the later undefeated",
  },
  {
    n: 22,
    name: "Shravana",
    planet: "Moon",
    deity: "Vishnu",
    theme: "The ear; the act of hearing and learning",
  },
  {
    n: 23,
    name: "Dhanishtha",
    planet: "Mars",
    deity: "Vasus",
    theme: "The wealthiest; the most famous and renowned",
  },
  {
    n: 24,
    name: "Shatabhisha",
    planet: "Rahu",
    deity: "Varuna",
    theme: "The hundred healers; the hundred physicians",
  },
  {
    n: 25,
    name: "Purva Bhadrapada",
    planet: "Jupiter",
    deity: "Aja Ekapada",
    theme: "The former auspicious feet; the earlier lucky steps",
  },
  {
    n: 26,
    name: "Uttara Bhadrapada",
    planet: "Saturn",
    deity: "Ahir Budhnya",
    theme: "The latter auspicious feet; the later lucky steps",
  },
  {
    n: 27,
    name: "Revati",
    planet: "Mercury",
    deity: "Pushan",
    theme: "The wealthy and prosperous; the abundant one",
  },
];

export interface XiuInfo {
  n: number;
  name: string;
  zh: string;
  group: string;
  theme: string;
}
export const XIU: XiuInfo[] = [
  {
    n: 1,
    name: "Horn",
    zh: "角",
    group: "Azure Dragon",
    theme:
      "Its natural pull is toward new cycles and upward movement — an energy of initiation and vital expansion that supports laying foundations and starting fresh.",
  },
  {
    n: 2,
    name: "Neck",
    zh: "亢",
    group: "Azure Dragon",
    theme:
      "Its character calls for pause and measured restraint — impulsive action meets natural resistance here, while spiritual work and meditation find good ground.",
  },
  {
    n: 3,
    name: "Root",
    zh: "氐",
    group: "Azure Dragon",
    theme:
      "A grounding energy that favors depth and stability — anything requiring solid foundations, long-term commitment, or material construction is well-supported.",
  },
  {
    n: 4,
    name: "Room",
    zh: "房",
    group: "Azure Dragon",
    theme:
      "An energy of natural prosperity and flowing abundance — trade, negotiation, and growth tend to find their footing with unusual ease.",
  },
  {
    n: 5,
    name: "Heart",
    zh: "心",
    group: "Azure Dragon",
    theme:
      "Carries intensity and potential volatility — this mansion's power is better channeled inward through prayer and spiritual practice than scattered in outward action.",
  },
  {
    n: 6,
    name: "Tail",
    zh: "尾",
    group: "Azure Dragon",
    theme:
      "An energy of completion and earned reward — actions carried through to their natural end are what this mansion truly supports.",
  },
  {
    n: 7,
    name: "Winnowing Basket",
    zh: "箕",
    group: "Azure Dragon",
    theme:
      "Its energy is kinetic and clearing — what needs to move, moves; what needs releasing, releases. Travel and clearing are natural fits.",
  },
  {
    n: 8,
    name: "Dipper",
    zh: "斗",
    group: "Black Tortoise",
    theme:
      "An energy of strategic depth and measured wisdom — research, planning, and study are genuinely in their element here.",
  },
  {
    n: 9,
    name: "Ox",
    zh: "牛",
    group: "Black Tortoise",
    theme:
      "Its character is disciplined endurance — slow, sustained effort and skilled craftsmanship are far more potent here than bursts of speed.",
  },
  {
    n: 10,
    name: "Girl",
    zh: "女",
    group: "Black Tortoise",
    theme:
      "A mansion of discretion and careful attention — its energy favors humility, healing, and inward work over bold assertion or outward expansion.",
  },
  {
    n: 11,
    name: "Emptiness",
    zh: "虚",
    group: "Black Tortoise",
    theme:
      "The Void mansion — its energy is genuinely still. Deep rest, mourning, and quiet surrender find their natural home; striving against it tends to backfire.",
  },
  {
    n: 12,
    name: "Rooftop",
    zh: "危",
    group: "Black Tortoise",
    theme:
      "Its energy carries an edge of precariousness — caution and spiritual attentiveness are its natural response; risky ventures and physical exposure are ill-favored.",
  },
  {
    n: 13,
    name: "Encampment",
    zh: "室",
    group: "Black Tortoise",
    theme:
      "A grounding energy of settlement and establishment — building a home, laying foundations, and securing a base all find good support here.",
  },
  {
    n: 14,
    name: "Wall",
    zh: "壁",
    group: "Black Tortoise",
    theme:
      "An energy of protection and accumulated knowledge — writing, study, and fortification are naturally favored; travel is less well-supported.",
  },
  {
    n: 15,
    name: "Legs",
    zh: "奎",
    group: "White Tiger",
    theme:
      "An energy of authority and literary power — leadership, learning, and structural building feel natural; funerals and endings are ill-suited.",
  },
  {
    n: 16,
    name: "Bond",
    zh: "娄",
    group: "White Tiger",
    theme:
      "Its energy naturally gathers and unites — trade, negotiation, and community strengthening find good soil, while conflict tends to dissolve.",
  },
  {
    n: 17,
    name: "Stomach",
    zh: "胃",
    group: "White Tiger",
    theme:
      "An energy of accumulation and resource management — business, trade, and storage are naturally well-suited; loss and endings are best avoided.",
  },
  {
    n: 18,
    name: "Hairy Head",
    zh: "昴",
    group: "White Tiger",
    theme:
      "An energy of illumination and spiritual clarity — it favors inner light over outer ambition, making it a good day for study and sacred work.",
  },
  {
    n: 19,
    name: "Net",
    zh: "毕",
    group: "White Tiger",
    theme:
      "Its energy is focused and acquisitive — business and purposeful pursuit tend to find what they seek; endings are best left alone.",
  },
  {
    n: 20,
    name: "Turtle Beak",
    zh: "觜",
    group: "White Tiger",
    theme:
      "An energy oriented toward precise speech and clear communication — writing, study, and negotiation are its domain; construction and marriage are less well-suited.",
  },
  {
    n: 21,
    name: "Three Stars",
    zh: "参",
    group: "White Tiger",
    theme:
      "Its energy is sharply separating — better suited to endings, clearing, and releasing than to new beginnings, construction, or commitments.",
  },
  {
    n: 22,
    name: "Well",
    zh: "井",
    group: "Vermilion Bird",
    theme:
      "An energy of nourishment and flowing resources — construction, business, and study all draw readily from this mansion's well.",
  },
  {
    n: 23,
    name: "Ghost",
    zh: "鬼",
    group: "Vermilion Bird",
    theme:
      "An energy that faces the unseen — offerings, prayer, and spiritual attentiveness are its natural territory; ordinary outward activity tends to meet friction.",
  },
  {
    n: 24,
    name: "Willow",
    zh: "柳",
    group: "Vermilion Bird",
    theme:
      "A yielding, mourning energy — healing and inner practice are supported; striving or celebrating against its grain creates friction.",
  },
  {
    n: 25,
    name: "Star",
    zh: "星",
    group: "Vermilion Bird",
    theme:
      "An energy of brilliance and outward renown — business, celebration, and visible action tend to shine; endings and mourning are ill-suited.",
  },
  {
    n: 26,
    name: "Extended Net",
    zh: "张",
    group: "Vermilion Bird",
    theme:
      "An energy of outward expansion and spreading — what is cast wide tends to catch; celebration, business, and construction all find good ground.",
  },
  {
    n: 27,
    name: "Wings",
    zh: "翼",
    group: "Vermilion Bird",
    theme:
      "An energy of support and studied preparation — learning, planning, and assisting others find good ground here; bold independent launches are less favored.",
  },
  {
    n: 28,
    name: "Chariot",
    zh: "轸",
    group: "Vermilion Bird",
    theme:
      "An energy of movement and transit — travel, trade, and getting things flowing from place to place are naturally supported; funerals should be avoided.",
  },
];

export interface StemInfo {
  name: string;
  zh: string;
}
export const STEMS: StemInfo[] = [
  { name: "Jiǎ", zh: "甲" },
  { name: "Yǐ", zh: "乙" },
  { name: "Bǐng", zh: "丙" },
  { name: "Dīng", zh: "丁" },
  { name: "Wù", zh: "戊" },
  { name: "Jǐ", zh: "己" },
  { name: "Gēng", zh: "庚" },
  { name: "Xīn", zh: "辛" },
  { name: "Rén", zh: "壬" },
  { name: "Guǐ", zh: "癸" },
];

export interface BranchInfo {
  name: string;
  zh: string;
  animal: string;
  emoji: string;
}
export const BRANCHES: BranchInfo[] = [
  { name: "Zǐ", zh: "子", animal: "Rat", emoji: "🐀" },
  { name: "Chǒu", zh: "丑", animal: "Ox", emoji: "🐂" },
  { name: "Yín", zh: "寅", animal: "Tiger", emoji: "🐅" },
  { name: "Mǎo", zh: "卯", animal: "Rabbit", emoji: "🐇" },
  { name: "Chén", zh: "辰", animal: "Dragon", emoji: "🐉" },
  { name: "Sì", zh: "巳", animal: "Snake", emoji: "🐍" },
  { name: "Wǔ", zh: "午", animal: "Horse", emoji: "🐴" },
  { name: "Wèi", zh: "未", animal: "Goat", emoji: "🐐" },
  { name: "Shēn", zh: "申", animal: "Monkey", emoji: "🐒" },
  { name: "Yǒu", zh: "酉", animal: "Rooster", emoji: "🐓" },
  { name: "Xū", zh: "戌", animal: "Dog", emoji: "🐕" },
  { name: "Hài", zh: "亥", animal: "Pig", emoji: "🐖" },
];
