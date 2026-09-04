import type { Icon } from "@raycast/api";

export const categories = [
  "Geradores",
  "Validadores",
  "Texto",
  "Computação",
  "Matemática",
  "Áreas",
  "Datas e Horas",
] as const;

export type Category = (typeof categories)[number];
export type ToolValues = Record<string, string | boolean | Date | undefined>;

export type FieldDefinition =
  | {
      type: "text" | "password" | "textarea";
      name: string;
      title: string;
      placeholder?: string;
      defaultValue?: string;
      required?: boolean;
    }
  | {
      type: "dropdown";
      name: string;
      title: string;
      defaultValue?: string;
      options: Array<{ title: string; value: string }>;
    }
  | {
      type: "checkbox";
      name: string;
      title: string;
      label: string;
      defaultValue?: boolean;
    }
  | {
      type: "date";
      name: string;
      title: string;
      defaultValue?: Date;
      required?: boolean;
    };

export interface ToolResult {
  title: string;
  value: string;
  subtitle?: string;
  metadata?: Array<{ label: string; value: string }>;
  sensitive?: boolean;
}

export interface ToolDefinition {
  id: string;
  title: string;
  description: string;
  category: Category;
  keywords?: string[];
  icon?: Icon;
  fields?: FieldDefinition[];
  run: (values: ToolValues) => ToolResult | Promise<ToolResult>;
}
