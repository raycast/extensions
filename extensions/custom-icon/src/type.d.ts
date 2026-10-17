export interface FormValues {
  iconFile: string[];
  targetApp: string[];
  restartApp: boolean;
  addBackground: boolean;
  backgroundType: string;
  solidColor: string;
  gradientPreset: string;
  customColor: string;
  backgroundImage: string[];
  useFolderIcon: boolean;
  preserveImageDetails: boolean;
  selectedEmoji: string; // Emoji short_name or empty string
}

export interface EmojiData {
  name: string;
  unified: string;
  short_name: string;
  short_names: string[];
  image: string;
  category: string;
  subcategory: string;
  sheet_x: number;
  sheet_y: number;
  has_img_apple: boolean;
}

export interface EmojiItem {
  shortName: string;
  displayName: string;
  emojiChar: string;
  category: string;
  sheetX: number;
  sheetY: number;
}

export type BackgroundType = "solid" | "gradient" | "custom" | "image";
