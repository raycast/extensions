export function inferType(object: { __proto__: { constructor: { name: string } } }) {
  return object.__proto__.constructor.name;
}
