type Attributes = {
  [key: string]: string | number;
};

type Child = string | [string, Attributes, Child[]];

export function createLucideIcon(tag: string, attrs: Attributes, children: Child[] = []): string {
  // Convert attributes object to a string
  const attrString = Object.entries(attrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");

  // Process children, recursively calling createElement for nested elements
  const childrenString = children
    .map((child) => (typeof child === "string" ? child : createLucideIcon(child[0], child[1], child[2])))
    .join("");

  // Construct and return the element string
  return `<${tag} ${attrString}>${childrenString}</${tag}>`;
}
