export interface DocType {
  section?: {
    sectionTitle: string;
    items: {
      title: string;
      url: string;
      description?: string;
      isDeprecated?: true;
      keyword?: string[];
      category?: string;
      subcategory?: string;
      objectProperties?: { name: string; type: string }[];
      objectPropertiesDeprecated?: { name: string; type: string }[];
      example?: string;
    }[];
  };
}
