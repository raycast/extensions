export const normaliseMacAddress = (macAddress: string): string => macAddress.replace(/:/g, "").toUpperCase();

export const split = (
  items: any[],
  splitFn: (item: any) => boolean
): [arrayItemsWhereSplitFnReturnedTrue: any[], arrayItemsWhereSplitFnReturnedFalse: any[]] => {
  return items.reduce(
    (accumulator, element) => {
      const [truthyItems, falseyItems] = accumulator;

      if (splitFn(element)) {
        return [[...truthyItems, element], falseyItems];
      } else {
        return [truthyItems, [...falseyItems, element]];
      }
    },
    [[], []]
  );
};
