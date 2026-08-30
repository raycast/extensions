declare module "bettertouchtool/catalog" {
  export interface ActionParamDoc {
    key: string;
    description: string;
    children?: ActionParamDoc[];
  }

  export interface ActionDefinition {
    id: number;
    name: string;
    slug: string;
    category: string;
    description: string;
    params: ActionParamDoc[];
    example: Record<string, unknown> | null;
  }

  export const actionCatalog: {
    all: readonly ActionDefinition[];
    byId(id: number): ActionDefinition | undefined;
    bySlug(slug: string): ActionDefinition | undefined;
    byName(name: string): ActionDefinition | undefined;
    search(query: string): ActionDefinition[];
    categories(): string[];
  };
}
