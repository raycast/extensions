export interface Dependency {
  id: string;
  shortId: string;
  version: string;
  name: string;
  description: string;
  shortName: string;
  category: string;
  transitiveExtensions: string[];
  tags: string[];
  keywords: string[];
  providesExampleCode: boolean;
  providesCode: boolean;
  guide: string;
  order: number;
  platform: boolean;
  bom: string;
}
