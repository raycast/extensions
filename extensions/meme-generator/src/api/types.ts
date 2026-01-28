import { Meme } from "../types";

export interface ApiModule {
  getMemes: () => Promise<{ success: true; memes: Meme[] }>;
  generateMeme: (input: { id: string; boxes: { text: string }[] }) => Promise<{ success: true; url: string }>;
  templatesUrl: string;
  parseTemplates: (response: Response) => Promise<Meme[]>;
}
