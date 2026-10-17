/**
 * Doom Menu Configuration
 * Extracted from doom-ascii/src/m_menu.c
 */

export interface MenuItem {
  id: string;
  title: string;
  description: string;
  hotkey: string;
  action?: () => void;
}

export interface MenuCategory {
  id: string;
  title: string;
  items: MenuItem[];
}

/**
 * Difficulty levels
 */
export const DIFFICULTY_LEVELS: MenuItem[] = [
  {
    id: "skill_1",
    title: "I'm too young to die",
    description: "Very Easy - For beginners, lots of ammo and health",
    hotkey: "i",
  },
  {
    id: "skill_2",
    title: "Hey, not too rough",
    description: "Easy - Slightly more challenging",
    hotkey: "h",
  },
  {
    id: "skill_3",
    title: "Hurt me plenty",
    description: "Normal - Standard Doom experience",
    hotkey: "h",
  },
  {
    id: "skill_4",
    title: "Ultra-Violence",
    description: "Hard - For experienced players",
    hotkey: "u",
  },
  {
    id: "skill_5",
    title: "Nightmare!",
    description: "Very Hard - Fast enemies, respawning monsters. Not even remotely fair!",
    hotkey: "n",
  },
];

/**
 * Episodes
 */
export const EPISODES: MenuItem[] = [
  {
    id: "episode_1",
    title: "Knee-Deep in the Dead",
    description: "Episode 1 - The classic first episode",
    hotkey: "k",
  },
  {
    id: "episode_2",
    title: "The Shores of Hell",
    description: "Episode 2 - Journey through Deimos (Registered version only)",
    hotkey: "t",
  },
  {
    id: "episode_3",
    title: "Inferno",
    description: "Episode 3 - Descend into Hell itself (Registered version only)",
    hotkey: "i",
  },
  {
    id: "episode_4",
    title: "Thy Flesh Consumed",
    description: "Episode 4 - Ultimate challenge (Ultimate DOOM only)",
    hotkey: "t",
  },
];

/**
 * Game configuration
 */
export interface GameConfig {
  episode: number;
  difficulty: number;
  scaling?: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  episode: 1,
  difficulty: 3, // Hurt me plenty
  scaling: 3, // 320/3 ≈ 106 width
};

/**
 * Instructions for gameplay
 */
export const INSTRUCTIONS = `# DOOM Controls

## Movement
- **W** - Move forward
- **S** - Move backward
- **A** - Turn left
- **D** - Turn right
- **Q** - Strafe left
- **E** - Strafe right

## Actions
- **F** - Fire weapon
- **R** - Use / Open doors
- **1-7** - Select weapons
- **Tab** - Show map
- **Cmd+M** - Open menu

## Menu Navigation
- **Return** - Select / Enter
- **Y** - Yes
- **N** - No
- **ESC** - Menu / Back

## Tips
- The game renders in ASCII art due to text-based display
- Menu options are hard to see in ASCII mode - use this menu to set up your game
- Press **Cmd+Shift+C** to copy the current frame to clipboard for debugging
- The game runs at lower resolution (106×20) to fit in Raycast

## Starting Your Game
1. Select your episode (only Episode 1 available in shareware)
2. Choose your difficulty level
3. Press "Start Game" to begin your adventure!

Good luck, Marine!

---

**Note:** This is DOOM Shareware (Episode 1 only). The ASCII rendering displays at 106×20 character resolution.`;
