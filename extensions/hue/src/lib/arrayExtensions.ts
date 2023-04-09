import { HasId } from "./types";

export {};

declare global {
  interface Array<T extends HasId> {
    /**
     * The <code>updateItem</code> method <strong>creates a new array</strong> with the <code>changes</code> applied to
     * the array element that matches the <code>id</code> of the given <code>item</code>.
     */
    updateItem(item: Partial<T>, changes: Partial<T>): T[];

    /**
     * The <code>replaceItems</code> method <strong>creates a new array</strong> where array elements are replaced with
     * the <code>newItems</code> if the <code>id</code> matches. If <code>changes</code> are provided, they are applied
     * to the <code>items</code> that are replaced.
     *
     * If the <code>id</code> does not match, the original array element is kept. No new array elements are added.
     */
    updateItems(items: Partial<T>[], changes?: Partial<T>): T[];

    /**
     * The <code>mergeObjectsById</code> method <strong>creates a new array</strong> where all objects with the same
     * <code>id</code> are merged.
     */
    mergeObjectsById(): T[];
  }
}

if (!Array.prototype.updateItem) {
  Array.prototype.updateItem = function (item, changes) {
    return this.map((it) => (it.id !== item.id ? it : { ...it, ...item, ...changes }));
  };
}

if (!Array.prototype.updateItems) {
  Array.prototype.updateItems = function (items, changes) {
    return this.map((it) => {
      const item = items.find((item) => item.id === it.id);
      return !item ? it : { ...it, ...item, ...changes };
    });
  };
}

if (!Array.prototype.mergeObjectsById) {
  Array.prototype.mergeObjectsById = function () {
    return Object.values(
      this.reduce((acc, obj) => {
        acc[obj.id] = !acc[obj.id] ? obj : { ...acc[obj.id], ...obj };
        return acc;
      }, {})
    );
  };
}
