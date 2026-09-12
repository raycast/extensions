import { environment } from "@raycast/api";
import path from "node:path";
import { ChiikawaCharacter, CharacterCategory } from "../types/character";

const OFFICIAL_CHARACTERS_BASE_URL = "https://www.chiikawaofficial.com/characters";

const OFFICIAL_CHARACTER_ANCHOR_BY_ID: Record<string, string> = {
  chiikawa: "chiikawa",
  hachiware: "hachiware",
  usagi: "usagi",
  momonga: "momonga",
  rakko: "rakko",
  kurimanju: "kurimanju",
  shisa: "shisa",
  furuhonya: "furuhonya",
  "pochette-no-yoroi-san": "pouchette",
  "roudou-no-yoroi-san": "roudou",
  "ramen-no-yoroi-san": "ramen",
};

export const CATEGORY_LABELS: Record<CharacterCategory, string> = {
  main: "Main Trio",
  friends: "Friends",
  "yoroi-san": "Yoroi-san",
};

const asset = (name: string) => path.join(environment.assetsPath, name);
const officialCharacterUrl = (id: string) =>
  `${OFFICIAL_CHARACTERS_BASE_URL}/#${OFFICIAL_CHARACTER_ANCHOR_BY_ID[id] ?? id}`;

export const CHARACTERS: ChiikawaCharacter[] = [
  {
    id: "chiikawa",
    nameEn: "Chiikawa",
    nameJp: "ちいかわ",
    nameRomanized: "chiikawa",
    category: "main",
    personality: ["Gentle", "Shy", "Anxious", "Kind"],
    description:
      "Chiikawa is gentle, sweet, and kind. Cautious to step out of their comfort zone, and somewhat shy, Chiikawa often gets nervous which usually results in anxious tears. Thankfully, best friends Hachiware and Usagi always has this cute and small creature’s back.",
    relationships: [
      { character: "Hachiware", description: "Best friend who supports Chiikawa through fears." },
      { character: "Usagi", description: "Chaotic friend who often pulls Chiikawa into adventures." },
    ],
    funFacts: ["Name comes from 'small and cute'.", "Often shown with anxious tears in emotional moments."],
    icon: asset("chiikawa.png"),
    officialUrl: officialCharacterUrl("chiikawa"),
  },
  {
    id: "hachiware",
    nameEn: "Hachiware",
    nameJp: "ハチワレ",
    nameRomanized: "hachiware",
    category: "main",
    personality: ["Optimistic", "Supportive", "Curious", "Friendly"],
    description:
      "Hachiware has a big heart, possesses a can-do attitude, and always finds the bright side. A true best friend, Hachiware helps Chiikawa overcome fears and makes them feel safe. Despite the cat-like ears and the occasional blep, for the record, Hachiware is not necessarily a cat.",
    relationships: [
      { character: "Chiikawa", description: "Core best-friend bond built on trust and care." },
      { character: "Usagi", description: "Friend whose wild energy contrasts Hachiware's calm optimism." },
    ],
    funFacts: ["Name references a black-and-white split pattern.", "Often acts as an emotional anchor in the trio."],
    icon: asset("hachiware.png"),
    officialUrl: officialCharacterUrl("hachiware"),
  },
  {
    id: "usagi",
    nameEn: "Usagi",
    nameJp: "うさぎ",
    nameRomanized: "usagi",
    category: "main",
    personality: ["Energetic", "Fearless", "Mysterious", "Chaotic"],
    description:
      "The most energetic of the crew, Usagi seems to find the fun. Though the word usagi literally means rabbit in Japanese, and Usagi has bunny-looking ears, it’s unclear Usagi’s identity. Maybe a rabbit, maybe not. Lively and fearless, Usagi is known for signature yells “Yaha!” and “Ura!”. Interestingly, no one knows where Usagi lives.",
    relationships: [
      { character: "Chiikawa", description: "Protective friend who frequently drags Chiikawa into bold situations." },
      { character: "Hachiware", description: "Complements Hachiware's calm with wild spontaneity." },
    ],
    funFacts: ["Known for catchphrases like 'Yaha!' and 'Ura!'.", "One of the most meme-loved characters by fans."],
    icon: asset("usagi.png"),
    officialUrl: officialCharacterUrl("usagi"),
    catchphrases: ["Yaha!", "Ura!"],
  },
  {
    id: "momonga",
    nameEn: "Momonga",
    nameJp: "モモンガ",
    nameRomanized: "momonga",
    category: "friends",
    personality: ["Demanding", "Manipulative", "Cute", "Showy"],
    description:
      "With wide expressive eyes and a big fluffy tail, Momonga is super cute and not afraid to use it. Prone to making unreasonable demands and causing trouble, the energetic Momonga often tries to wield their adorableness to get their way. Also, momonga can fly.",
    relationships: [
      { character: "Roudou no Yoroi-san", description: "Frequently causes trouble during work-related interactions." },
      { character: "Furuhonya", description: "Gives Furuhonya a crab headband." },
    ],
    funFacts: ["Can glide or fly.", "Uses cuteness as leverage in conversations."],
    icon: asset("momonga.png"),
    officialUrl: officialCharacterUrl("momonga"),
  },
  {
    id: "rakko",
    nameEn: "Rakko",
    nameJp: "ラッコ",
    nameRomanized: "rakko",
    category: "friends",
    personality: ["Skilled", "Calm", "Reliable", "Strong"],
    description:
      "A highly regarded hunter, and respected for bravery, Rakko is the #1 top ranking leader in the field of monster hunting. While skilled with a sword, Rakko is generous and kind and enjoys helping Chiikawa and friends to improve their hunting abilities. Rakko also loves to indulge in sweet treats!",
    relationships: [
      { character: "Chiikawa and friends", description: "A respected senior figure admired for combat skills." },
    ],
    funFacts: ["Recognized as a No.1 hunter.", "Has a well-known love of sweets."],
    icon: asset("rakko.png"),
    officialUrl: officialCharacterUrl("rakko"),
  },
  {
    id: "kurimanju",
    nameEn: "Kurimanju",
    nameJp: "くりまんじゅう",
    nameRomanized: "kurimanju",
    category: "friends",
    personality: ["Quiet", "Composed", "Mature", "Relaxed"],
    description:
      "Kurimanju has a certain fondness for beverages… strong ones. Equipped with a drinking license, Kurimanju is often seen with snacks and drinks in hand and is known for making a big sigh after finishing the last sip. Though quiet in nature, Kurimanju is kind and can be found sharing food with Chiikawa and friends.",
    relationships: [
      { character: "Friend group", description: "Acts as a steady, calm presence among energetic personalities." },
    ],
    funFacts: ["Known as a beverage enthusiast.", "Has a drinking license in-universe."],
    icon: asset("kurimanju.png"),
    officialUrl: officialCharacterUrl("kurimanju"),
  },
  {
    id: "shisa",
    nameEn: "Shisa",
    nameJp: "シーサー",
    nameRomanized: "shisa",
    category: "friends",
    personality: ["Hard-working", "Earnest", "Loyal", "Humble"],
    description:
      'Inspired by the guardians of the Ryukyu islands, the lion-esque looking Shisa is a hard worker to the core. After passing the extremely difficult "super part - time worker qualification," exam, Shisa works as an assistant to the chef Ramen Yoroi-san at Rou. Shisa regards the boss as a ramen master and holds them in the highest esteem.',
    relationships: [{ character: "Ramen no Yoroi-san", description: "Boss and mentor figure at ramen shop Rou." }],
    funFacts: ["Works at ramen shop Rou.", "Aspires to become fully capable in the shop."],
    icon: asset("shisa.png"),
    officialUrl: officialCharacterUrl("shisa"),
  },
  {
    id: "furuhonya",
    nameEn: "Furuhonya",
    nameJp: "古本屋",
    nameRomanized: "furuhonya",
    category: "friends",
    personality: ["Bookish", "Gentle", "Quiet", "Thoughtful"],
    description:
      "Furuhonya is a kindhearted bookworm who buys and sells secondhand books. Kindhearted and considerate, this lovable pink pal is friends withMomonga. In fact, Furuhonya’s crab-shaped headband was a gift from Momonga. Furuhonya is sometimes called Kani chan by fans. Kani means crab in Japanese.",
    relationships: [{ character: "Momonga", description: "Receives a crab headband from Momonga." }],
    funFacts: ["Associated with used books and reading culture.", "Often depicted with the crab headband gift."],
    icon: asset("furuhonya.png"),
    officialUrl: officialCharacterUrl("furuhonya"),
  },
  {
    id: "pochette-no-yoroi-san",
    nameEn: "Pochette no Yoroi-san",
    nameJp: "ポシェットの鎧さん",
    nameRomanized: "pochette no yoroi san",
    category: "yoroi-san",
    personality: ["Gentle", "Crafty", "Protective", "Thoughtful"],
    description:
      "Pochette no-Yoroi-san is a gentle knight who loves cute things. He enjoys crafting and sells handmade pajamas.",
    relationships: [
      { character: "Chiikawa and friends", description: "Supports the cast through handmade goods and kindness." },
    ],
    funFacts: ["Loves cute things.", "Noted for crafting pajamas."],
    icon: asset("pochette-no-yoroi-san.png"),
    officialUrl: officialCharacterUrl("pochette-no-yoroi-san"),
  },
  {
    id: "roudou-no-yoroi-san",
    nameEn: "Roudou no Yoroi-san",
    nameJp: "労働の鎧さん",
    nameRomanized: "roudou no yoroi san",
    category: "yoroi-san",
    personality: ["Orderly", "Responsible", "Practical", "Patient"],
    description:
      "Roudou no Yori-san oversees handing out the work assignments. Unfortunately, Roudou no Yori-san often gets tangled up in Momonga’s mischief.",
    relationships: [{ character: "Momonga", description: "Frequent target of Momonga's troublesome antics." }],
    funFacts: ["Manages task assignments.", "Represents workplace structure in the series."],
    icon: asset("roudou-no-yoroi-san.png"),
    officialUrl: officialCharacterUrl("roudou-no-yoroi-san"),
  },
  {
    id: "ramen-no-yoroi-san",
    nameEn: "Ramen no Yoroi-san",
    nameJp: "ラーメンの鎧さん",
    nameRomanized: "ramen no yoroi san",
    category: "yoroi-san",
    personality: ["Disciplined", "Supportive", "Serious", "Kind"],
    description:
      "Ramen no Yoroi-san owns the local ramen shop called “Rou”. Ramen no Yorio-san’s assistant, Shisa, is a not-so-secret admirer.",
    relationships: [{ character: "Shisa", description: "Boss and admired mentor at ramen shop Rou." }],
    funFacts: ["Runs ramen shop Rou.", "Connected to many food-centric fan-favorite scenes."],
    icon: asset("ramen-no-yoroi-san.png"),
    officialUrl: officialCharacterUrl("ramen-no-yoroi-san"),
  },
];
