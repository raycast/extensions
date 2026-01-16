import { Icon, Image } from "@raycast/api";

/**
 * Static mapping of category_id to Raycast icons
 */
export const CATEGORY_ICONS: Record<string, Image.ImageLike | undefined> = {
  "3d": Icon.Box,
  agent: Icon.Person,
  agents: Icon.TwoPeople,
  audio: Icon.Headphones,
  chemistry: Icon.Pill,
  code: Icon.Code,
  coding: Icon.CodeBlock,
  general: Icon.Star,
  healthcare: Icon.MedicalSupport,
  finance: Icon.Coins,
  math: Icon.Calculator,
  reasoning: Icon.MagnifyingGlass,
  spatial_reasoning: Icon.Eye,
  vision: Icon.Eye,
  multimodal: Icon.Image,
  language: Icon.Globe,
  physics: Icon.Bolt,
  long_context: Icon.Document,
  structured_output: Icon.List,
  tool_calling: Icon.WrenchScrewdriver,
  frontend_development: Icon.AppWindow,
  safety: Icon.Shield,
  communication: Icon.Bubble,
  summarization: Icon.Document,
  "image-to-text": Icon.Camera,
  "speech-to-text": Icon.Headphones,
  "text-to-image": Icon.Text,
  document: Icon.Book,
  economics: Icon.BankNote,
  roleplay: Icon.TwoPeople,
  legal: `https://api.iconify.design/mdi/gavel.svg`,
  video: Icon.Video,
  writing: Icon.Pencil,
  search: Icon.MagnifyingGlass,
  robotics: `https://api.iconify.design/mdi/robot-outline.svg`,
  psychology: `https://api.iconify.design/mdi/brain.svg`,
  creativity: Icon.LightBulb,
};

/**
 * Gets icon for a category by its ID
 * @param categoryId - The category ID
 * @returns Image.ImageLike with fallback to Icon.Stars
 */
export function getCategoryIcon(categoryId: string): Image.ImageLike {
  return CATEGORY_ICONS[categoryId] || Icon.Stars;
}
