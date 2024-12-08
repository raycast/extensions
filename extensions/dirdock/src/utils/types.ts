// src/utils/types.ts

export interface Tag {
  id: string;
  name: string;
  color: string; // HEX color code, e.g., "#FF5733"
}

export interface Directory {
  id: string;
  path: string;
  name: string;
  tags: string[]; // Array of Tag IDs
}
