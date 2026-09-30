export const stringifyBigInt = (object: any) => {
  return JSON.stringify(
    object,
    (key, value) => (typeof value === "bigint" ? value.toString() : value), // return everything else unchanged
    4
  );
};
