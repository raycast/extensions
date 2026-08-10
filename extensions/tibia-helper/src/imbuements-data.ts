// Auto-generated from scraped data
export interface ImbuementMaterial {
  item: string;
  amount: number;
}

export interface ImbuementTier {
  tier: string;
  effect: string;
  materials: ImbuementMaterial[];
}

export interface Imbuement {
  name: string;
  real_name: string;
  description: string;
  equipmentTypes: string[];
  tiers: ImbuementTier[];
}

export const IMBUEMENTS: Imbuement[] = [
  {
    name: "Fire Damage",
    real_name: "Scorch",
    description: "Converts physical damage to fire damage",
    equipmentTypes: ["Weapons (Melee, Bows, Crossbows, Wands, Rods)"],
    tiers: [
      {
        tier: "Basic",
        effect: "10%",
        materials: [
          {
            item: "Fiery Heart",
            amount: 25,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "25%",
        materials: [
          {
            item: "Fiery Heart",
            amount: 25,
          },
          {
            item: "Green Dragon Scale",
            amount: 5,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "50%",
        materials: [
          {
            item: "Fiery Heart",
            amount: 25,
          },
          {
            item: "Green Dragon Scale",
            amount: 5,
          },
          {
            item: "Demon Horn",
            amount: 5,
          },
        ],
      },
    ],
  },
  {
    name: "Earth Damage",
    real_name: "Venom",
    description: "Converts physical damage to earth damage",
    equipmentTypes: ["Weapons (Melee, Bows, Crossbows, Wands, Rods)"],
    tiers: [
      {
        tier: "Basic",
        effect: "10%",
        materials: [
          {
            item: "Swamp Grass",
            amount: 25,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "25%",
        materials: [
          {
            item: "Swamp Grass",
            amount: 25,
          },
          {
            item: "Poisonous Slime",
            amount: 20,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "50%",
        materials: [
          {
            item: "Swamp Grass",
            amount: 25,
          },
          {
            item: "Poisonous Slime",
            amount: 20,
          },
          {
            item: "Slime Heart",
            amount: 2,
          },
        ],
      },
    ],
  },
  {
    name: "Ice Damage",
    real_name: "Frost",
    description: "Converts physical damage to ice damage",
    equipmentTypes: ["Weapons (Melee, Bows, Crossbows, Wands, Rods)"],
    tiers: [
      {
        tier: "Basic",
        effect: "10%",
        materials: [
          {
            item: "Frosty Heart",
            amount: 25,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "25%",
        materials: [
          {
            item: "Frosty Heart",
            amount: 25,
          },
          {
            item: "Seacrest Hair",
            amount: 10,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "50%",
        materials: [
          {
            item: "Frosty Heart",
            amount: 25,
          },
          {
            item: "Seacrest Hair",
            amount: 10,
          },
          {
            item: "Polar Bear Paw",
            amount: 5,
          },
        ],
      },
    ],
  },
  {
    name: "Energy Damage",
    real_name: "Electrify",
    description: "Converts physical damage to energy damage",
    equipmentTypes: ["Weapons (Melee, Bows, Crossbows, Wands, Rods)"],
    tiers: [
      {
        tier: "Basic",
        effect: "10%",
        materials: [
          {
            item: "Rorc Feather",
            amount: 25,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "25%",
        materials: [
          {
            item: "Rorc Feather",
            amount: 25,
          },
          {
            item: "Peacock Feather Fan",
            amount: 5,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "50%",
        materials: [
          {
            item: "Rorc Feather",
            amount: 25,
          },
          {
            item: "Peacock Feather Fan",
            amount: 5,
          },
          {
            item: "Energy Vein",
            amount: 1,
          },
        ],
      },
    ],
  },
  {
    name: "Death Damage",
    real_name: "Reap",
    description: "Converts physical damage to death damage",
    equipmentTypes: ["Weapons (Melee, Bows, Crossbows, Wands, Rods)"],
    tiers: [
      {
        tier: "Basic",
        effect: "10%",
        materials: [
          {
            item: "Pile of Grave Earth",
            amount: 25,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "25%",
        materials: [
          {
            item: "Pile of Grave Earth",
            amount: 25,
          },
          {
            item: "Demonic Skeletal Hand",
            amount: 20,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "50%",
        materials: [
          {
            item: "Pile of Grave Earth",
            amount: 25,
          },
          {
            item: "Demonic Skeletal Hand",
            amount: 20,
          },
          {
            item: "Petrified Scream",
            amount: 5,
          },
        ],
      },
    ],
  },
  {
    name: "Life Leech",
    real_name: "Vampirism",
    description: "Converts damage dealt into healing",
    equipmentTypes: ["Weapons (Melee, Bows, Crossbows, Wands, Rods)"],
    tiers: [
      {
        tier: "Basic",
        effect: "5%",
        materials: [
          {
            item: "Vampire Teeth",
            amount: 25,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "10%",
        materials: [
          {
            item: "Vampire Teeth",
            amount: 25,
          },
          {
            item: "Bloody Pincers",
            amount: 15,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "25%",
        materials: [
          {
            item: "Vampire Teeth",
            amount: 25,
          },
          {
            item: "Bloody Pincers",
            amount: 15,
          },
          {
            item: "Piece of Dead Brain",
            amount: 5,
          },
        ],
      },
    ],
  },
  {
    name: "Mana Leech",
    real_name: "Void",
    description: "Converts damage dealt into mana",
    equipmentTypes: ["Weapons (Melee, Bows, Crossbows, Wands, Rods)"],
    tiers: [
      {
        tier: "Basic",
        effect: "3%",
        materials: [
          {
            item: "Rope Belt",
            amount: 25,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "5%",
        materials: [
          {
            item: "Rope Belt",
            amount: 25,
          },
          {
            item: "Silencer Claws",
            amount: 25,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "8%",
        materials: [
          {
            item: "Rope Belt",
            amount: 25,
          },
          {
            item: "Silencer Claws",
            amount: 25,
          },
          {
            item: "Some Grimeleech Wings",
            amount: 5,
          },
        ],
      },
    ],
  },
  {
    name: "Critical Hit",
    real_name: "Strike",
    description: "Increases critical hit chance and critical hit damage",
    equipmentTypes: ["Weapons (Melee, Bows, Crossbows)"],
    tiers: [
      {
        tier: "Basic",
        effect: "5%, 5%",
        materials: [
          {
            item: "Protective Charm",
            amount: 20,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "5%, 15%",
        materials: [
          {
            item: "Protective Charm",
            amount: 20,
          },
          {
            item: "Sabretooth",
            amount: 25,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "5%, 40%",
        materials: [
          {
            item: "Protective Charm",
            amount: 20,
          },
          {
            item: "Sabretooth",
            amount: 25,
          },
          {
            item: "Vexclaw Talon",
            amount: 5,
          },
        ],
      },
    ],
  },
  {
    name: "Death Protection",
    real_name: "Lich Shroud",
    description: "Reduces death damage taken",
    equipmentTypes: ["Armor", "Helmets"],
    tiers: [
      {
        tier: "Basic",
        effect: "2%",
        materials: [
          {
            item: "Flask of Embalming Fluid",
            amount: 25,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "5%",
        materials: [
          {
            item: "Flask of Embalming Fluid",
            amount: 25,
          },
          {
            item: "Gloom Wolf Fur",
            amount: 20,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "10%",
        materials: [
          {
            item: "Flask of Embalming Fluid",
            amount: 25,
          },
          {
            item: "Gloom Wolf Fur",
            amount: 20,
          },
          {
            item: "Mystical Hourglass",
            amount: 5,
          },
        ],
      },
    ],
  },
  {
    name: "Earth Protection",
    real_name: "Snake Skin",
    description: "Reduces earth damage taken",
    equipmentTypes: ["Armor", "Helmets"],
    tiers: [
      {
        tier: "Basic",
        effect: "3%",
        materials: [
          {
            item: "Piece of Swampling Wood",
            amount: 25,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "8%",
        materials: [
          {
            item: "Piece of Swampling Wood",
            amount: 25,
          },
          {
            item: "Snake Skin",
            amount: 20,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "15%",
        materials: [
          {
            item: "Piece of Swampling Wood",
            amount: 25,
          },
          {
            item: "Snake Skin",
            amount: 20,
          },
          {
            item: "Brimstone Fangs",
            amount: 10,
          },
        ],
      },
    ],
  },
  {
    name: "Fire Protection",
    real_name: "Dragon Hide",
    description: "Reduces fire damage taken",
    equipmentTypes: ["Armor", "Helmets"],
    tiers: [
      {
        tier: "Basic",
        effect: "3%",
        materials: [
          {
            item: "Green Dragon Leather",
            amount: 20,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "8%",
        materials: [
          {
            item: "Green Dragon Leather",
            amount: 20,
          },
          {
            item: "Blazing Bone",
            amount: 10,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "15%",
        materials: [
          {
            item: "Green Dragon Leather",
            amount: 20,
          },
          {
            item: "Blazing Bone",
            amount: 10,
          },
          {
            item: "Draken Sulphur",
            amount: 5,
          },
        ],
      },
    ],
  },
  {
    name: "Ice Protection",
    real_name: "Quara Scale",
    description: "Reduces ice damage taken",
    equipmentTypes: ["Armor", "Helmets"],
    tiers: [
      {
        tier: "Basic",
        effect: "3%",
        materials: [
          {
            item: "Winter Wolf Fur",
            amount: 25,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "8%",
        materials: [
          {
            item: "Winter Wolf Fur",
            amount: 25,
          },
          {
            item: "Thick Fur",
            amount: 15,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "15%",
        materials: [
          {
            item: "Winter Wolf Fur",
            amount: 25,
          },
          {
            item: "Thick Fur",
            amount: 15,
          },
          {
            item: "Deepling Warts",
            amount: 10,
          },
        ],
      },
    ],
  },
  {
    name: "Energy Protection",
    real_name: "Cloud Fabric",
    description: "Reduces energy damage taken",
    equipmentTypes: ["Armor", "Helmets"],
    tiers: [
      {
        tier: "Basic",
        effect: "3%",
        materials: [
          {
            item: "Wyvern Talisman",
            amount: 20,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "8%",
        materials: [
          {
            item: "Wyvern Talisman",
            amount: 20,
          },
          {
            item: "Crawler Head Plating",
            amount: 15,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "15%",
        materials: [
          {
            item: "Wyvern Talisman",
            amount: 20,
          },
          {
            item: "Crawler Head Plating",
            amount: 15,
          },
          {
            item: "Wyrm Scale",
            amount: 10,
          },
        ],
      },
    ],
  },
  {
    name: "Holy Protection",
    real_name: "Demon Presence",
    description: "Reduces holy damage taken",
    equipmentTypes: ["Armor", "Helmets"],
    tiers: [
      {
        tier: "Basic",
        effect: "3%",
        materials: [
          {
            item: "Cultish Robe",
            amount: 25,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "8%",
        materials: [
          {
            item: "Cultish Robe",
            amount: 25,
          },
          {
            item: "Cultish Mask",
            amount: 25,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "15%",
        materials: [
          {
            item: "Cultish Robe",
            amount: 25,
          },
          {
            item: "Cultish Mask",
            amount: 25,
          },
          {
            item: "Hellspawn Tail",
            amount: 20,
          },
        ],
      },
    ],
  },
  {
    name: "Paralysis Deflection",
    real_name: "Vibrancy",
    description: "Removes paralysis with a chance",
    equipmentTypes: ["Boots"],
    tiers: [
      {
        tier: "Basic",
        effect: "15%",
        materials: [
          {
            item: "Wereboar Hooves",
            amount: 20,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "25%",
        materials: [
          {
            item: "Wereboar Hooves",
            amount: 20,
          },
          {
            item: "Crystallized Anger",
            amount: 15,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "50%",
        materials: [
          {
            item: "Wereboar Hooves",
            amount: 20,
          },
          {
            item: "Crystallized Anger",
            amount: 15,
          },
          {
            item: "Quill",
            amount: 5,
          },
        ],
      },
    ],
  },
  {
    name: "Speed Boost",
    real_name: "Swiftness",
    description: "Increases movement speed",
    equipmentTypes: ["Boots"],
    tiers: [
      {
        tier: "Basic",
        effect: "10",
        materials: [
          {
            item: "Damselfly Wing",
            amount: 15,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "15",
        materials: [
          {
            item: "Damselfly Wing",
            amount: 15,
          },
          {
            item: "Compass",
            amount: 25,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "30",
        materials: [
          {
            item: "Damselfly Wing",
            amount: 15,
          },
          {
            item: "Compass",
            amount: 25,
          },
          {
            item: "Waspoid Wing",
            amount: 20,
          },
        ],
      },
    ],
  },
  {
    name: "Capacity Boost",
    real_name: "Featherweight",
    description: "Increases carrying capacity",
    equipmentTypes: ["Backpacks"],
    tiers: [
      {
        tier: "Basic",
        effect: "3%",
        materials: [
          {
            item: "Fairy Wings",
            amount: 20,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "8%",
        materials: [
          {
            item: "Fairy Wings",
            amount: 20,
          },
          {
            item: "Little Bowl of Myrrh",
            amount: 10,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "15%",
        materials: [
          {
            item: "Fairy Wings",
            amount: 20,
          },
          {
            item: "Little Bowl of Myrrh",
            amount: 10,
          },
          {
            item: "Goosebump Leather",
            amount: 5,
          },
        ],
      },
    ],
  },
  {
    name: "Magic Level Boost",
    real_name: "Epiphany",
    description: "Increases magic level",
    equipmentTypes: ["Helmets", "Weapons (Wands, Rods)", "Spellbooks"],
    tiers: [
      {
        tier: "Basic",
        effect: "1",
        materials: [
          {
            item: "Elvish Talisman",
            amount: 25,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "2",
        materials: [
          {
            item: "Elvish Talisman",
            amount: 25,
          },
          {
            item: "Broken Shamanic Staff",
            amount: 15,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "4",
        materials: [
          {
            item: "Elvish Talisman",
            amount: 25,
          },
          {
            item: "Broken Shamanic Staff",
            amount: 15,
          },
          {
            item: "Strand of Medusa Hair",
            amount: 15,
          },
        ],
      },
    ],
  },
  {
    name: "Club Fighting Boost",
    real_name: "Punch",
    description: "Increases club fighting skill",
    equipmentTypes: ["Weapons (Clubs)"],
    tiers: [
      {
        tier: "Basic",
        effect: "1",
        materials: [
          {
            item: "Tarantula Egg",
            amount: 25,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "2",
        materials: [
          {
            item: "Tarantula Egg",
            amount: 25,
          },
          {
            item: "Mantassin Tail",
            amount: 20,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "4",
        materials: [
          {
            item: "Tarantula Egg",
            amount: 25,
          },
          {
            item: "Mantassin Tail",
            amount: 20,
          },
          {
            item: "Gold-Brocaded Cloth",
            amount: 15,
          },
        ],
      },
    ],
  },
  {
    name: "Axe Fighting Boost",
    real_name: "Bash",
    description: "Increases axe fighting skill",
    equipmentTypes: ["Weapons (Axes)"],
    tiers: [
      {
        tier: "Basic",
        effect: "1",
        materials: [
          {
            item: "Cyclops Toe",
            amount: 20,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "2",
        materials: [
          {
            item: "Cyclops Toe",
            amount: 20,
          },
          {
            item: "Ogre Nose Ring",
            amount: 15,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "4",
        materials: [
          {
            item: "Cyclops Toe",
            amount: 20,
          },
          {
            item: "Ogre Nose Ring",
            amount: 15,
          },
          {
            item: "Warmaster's Wristguards",
            amount: 10,
          },
        ],
      },
    ],
  },
  {
    name: "Sword Fighting Boost",
    real_name: "Slash",
    description: "Increases sword fighting skill",
    equipmentTypes: ["Weapons (Swords)"],
    tiers: [
      {
        tier: "Basic",
        effect: "1",
        materials: [
          {
            item: "Lion's Mane",
            amount: 25,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "2",
        materials: [
          {
            item: "Lion's Mane",
            amount: 25,
          },
          {
            item: "Mooh'tah Shell",
            amount: 25,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "4",
        materials: [
          {
            item: "Lion's Mane",
            amount: 25,
          },
          {
            item: "Mooh'tah Shell",
            amount: 25,
          },
          {
            item: "War Crystal",
            amount: 5,
          },
        ],
      },
    ],
  },
  {
    name: "Distance Fighting Boost",
    real_name: "Chop",
    description: "Increases distance fighting skill",
    equipmentTypes: ["Weapons (Bows, Crossbows)"],
    tiers: [
      {
        tier: "Basic",
        effect: "1",
        materials: [
          {
            item: "Orc Tooth",
            amount: 20,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "2",
        materials: [
          {
            item: "Orc Tooth",
            amount: 20,
          },
          {
            item: "Battle Stone",
            amount: 25,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "4",
        materials: [
          {
            item: "Orc Tooth",
            amount: 20,
          },
          {
            item: "Battle Stone",
            amount: 25,
          },
          {
            item: "Moohtant Horn",
            amount: 20,
          },
        ],
      },
    ],
  },
  {
    name: "Shielding Boost",
    real_name: "Precision",
    description: "Increases shielding skill",
    equipmentTypes: ["Shields"],
    tiers: [
      {
        tier: "Basic",
        effect: "1",
        materials: [
          {
            item: "Elven Scouting Glass",
            amount: 25,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "2",
        materials: [
          {
            item: "Elven Scouting Glass",
            amount: 25,
          },
          {
            item: "Elven Hoof",
            amount: 20,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "4",
        materials: [
          {
            item: "Elven Scouting Glass",
            amount: 25,
          },
          {
            item: "Elven Hoof",
            amount: 20,
          },
          {
            item: "Metal Spike",
            amount: 10,
          },
        ],
      },
    ],
  },
  {
    name: "Defense Boost",
    real_name: "Blockade",
    description: "Increases defense",
    equipmentTypes: ["Armor"],
    tiers: [
      {
        tier: "Basic",
        effect: "1",
        materials: [
          {
            item: "Piece of Scarab Shell",
            amount: 20,
          },
        ],
      },
      {
        tier: "Intricate",
        effect: "2",
        materials: [
          {
            item: "Piece of Scarab Shell",
            amount: 20,
          },
          {
            item: "Brimstone Shell",
            amount: 25,
          },
        ],
      },
      {
        tier: "Powerful",
        effect: "4",
        materials: [
          {
            item: "Piece of Scarab Shell",
            amount: 20,
          },
          {
            item: "Brimstone Shell",
            amount: 25,
          },
          {
            item: "Frazzle Skin",
            amount: 25,
          },
        ],
      },
    ],
  },
];
