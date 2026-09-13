const collator = new Intl.Collator(undefined, { numeric: true });

/** Natural filename order, shared by alphabetical sorting and score ties. */
export const compareNames = collator.compare;
