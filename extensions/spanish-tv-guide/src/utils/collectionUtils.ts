import { Maybe } from "monet";
import { findLast } from "lodash";
import { equals, find as scan, indexOf, insert, without } from "ramda";

const replace = <T>(item: T) => {
  return {
    in: (list: T[]) => ({
      with: (newItem: T): T[] => {
        const listWithoutItem = without([item], list);
        return Maybe.fromNull(scan((currentItem: T) => equals(currentItem, item))(list))
          .map((item) => insert(indexOf(item, list), newItem, listWithoutItem))
          .orJust(list);
      },
    }),
  };
};

export { findLast, replace };
