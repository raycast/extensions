export interface GameState {
  tiles: number[];
  hp: number;
  lastRoll: number[];
  selected: number[];
  message: string;
  gameOver: boolean;
  showHelp: boolean;
  victories: number;
  defeats: number;
  randomLifePattern: string[];
}

export interface GameConfig {
  nbDice: number;
  faces: number;
  nbTiles: number;
  hpInit: number;
}

export interface RewardSystem {
  emojis: string[];
  thresholds: number[];
  randomEmojis: string[];
}
