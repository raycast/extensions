// constants/volume.ts
import { Color, Icon } from "@raycast/api";
import type { VolumeScheme } from "../types/volume";

export const VOLUME_RESOURCES = {
  LINKS: {
    STRENGTH: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4562558/", // Strength Training Meta-Analysis
    HYPERTROPHY: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6950543/", // Hypertrophy Training Review
    GENERAL: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6303131/", // Training Volume Guidelines
    WIKI: "https://en.wikipedia.org/wiki/Strength_training",
  },
  DOCS: {
    STRENGTH: "Brad Schoenfeld's research on training volume",
    HYPERTROPHY: "Meta-analysis on volume and muscle growth",
    GENERAL: "Volume guidelines for different training goals",
  },
};

export const VOLUME_SCHEMES: VolumeScheme[] = [
  {
    goal: "strength",
    sets: 5,
    reps: 3,
    percentage: 0.85,
    color: Color.Red,
    icon: Icon.Weights,
    restMinutes: 3,
  },
  {
    goal: "power",
    sets: 6,
    reps: 2,
    percentage: 0.9,
    color: Color.Orange,
    icon: Icon.LightBulb,
    restMinutes: 3,
  },
  {
    goal: "hypertrophy",
    sets: 4,
    reps: 8,
    percentage: 0.75,
    color: Color.Yellow,
    icon: Icon.Person,
    restMinutes: 2,
  },
  {
    goal: "endurance",
    sets: 3,
    reps: 12,
    percentage: 0.65,
    color: Color.Green,
    icon: Icon.Clock,
    restMinutes: 1,
  },
];

export const TRAINING_DESCRIPTIONS = {
  strength: `## Strength Training Protocol

    Based on research from the Journal of Strength and Conditioning Research, this protocol optimizes maximal strength gains.
    
    Focus on maximal force production with:
    - Heavy loads (85% of 1RM)
    - Lower reps (3 per set)
    - Longer rest periods (3 minutes)
    - Total of 5 sets
    
    Perfect for:
    - Powerlifters
    - Strength athletes
    - Anyone focusing on maximal strength
    
    Research shows this volume and intensity combination optimally stimulates neural adaptations while managing fatigue.`,

  power: `## Power Development Protocol
    
    Research from the International Journal of Sports Physiology and Performance supports this protocol for power development.
    
    Emphasize explosive force with:
    - Very heavy loads (90% of 1RM)
    - Low reps (2 per set)
    - Full recovery (3 minutes rest)
    - Total of 6 sets
    
    Ideal for:
    - Olympic lifters
    - Athletes
    - Explosive strength development`,

  hypertrophy: `## Muscle Growth Protocol

Optimize muscle growth with:
- Moderate loads (75% of 1RM)
- Medium reps (8 per set)
- Moderate rest (2 minutes)
- Total of 4 sets

Best for:
- Bodybuilders
- Size gains
- General muscle development`,

  endurance: `## Muscular Endurance Protocol

Build work capacity with:
- Lighter loads (65% of 1RM)
- Higher reps (12 per set)
- Short rest (1 minute)
- Total of 3 sets

Great for:
- Endurance athletes
- Conditioning
- Work capacity development`,
};
