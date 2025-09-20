import { HasId, Id } from "../lib/types";

export {};

declare global {
  interface Array<T extends HasId> {
    /**
     * The <code>updateItem</code> method <strong>creates a new array</strong> with the <code>changes</code> applied to
     * the array element that matches the <code>id</code> of the given <code>item</code>.
     */
    updateItem(item: Id, changes: Partial<T>): T[];

    /**
     * The <code>replaceItems</code> method <strong>creates a new array</strong> where array elements are replaced with
     * the <code>newItems</code> if the <code>id</code> matches.
     */
    replaceItems(items: Partial<T>[]): T[];

    /**
     * The <code>replaceItems</code> method <strong>creates a new array</strong> where array elements are updated with
     * the <code>changes</code> if the <code>id</code> matches.
     */
    updateItems(itemChanges: Map<Id, Partial<T>>): T[];

    /**
     * The <code>mergeObjectsById</code> method <strong>creates a new array</strong> where all objects with the same
     * <code>id</code> are merged.
     */
    mergeObjectsById(): T[];
  }
}

if (!Array.prototype.updateItem) {
  Array.prototype.updateItem = function (id, changes) {
    return this.map((it) => (it.id !== id ? it : { ...it, ...changes }));
  };
}

if (!Array.prototype.updateItems) {
  Array.prototype.updateItems = function <T extends HasId>(changes: Map<Id, Partial<T>>): T[] {
    return this.map((it) => {
      const change = changes.get(it.id);
      return !change ? it : { ...it, ...change };
    });
  };
}

if (!Array.prototype.replaceItems) {
  Array.prototype.replaceItems = function (items) {
    return this.map((it) => {
      const item = items.find((item) => item.id === it.id);
      return !item ? it : { ...it, ...item };
    });
  };
}

if (!Array.prototype.mergeObjectsById) {
  Array.prototype.mergeObjectsById = function () {
    return Object.values(
      this.reduce((acc, obj) => {
        acc[obj.id] = !acc[obj.id] ? obj : { ...acc[obj.id], ...obj };
        return acc;
      }, {}),
    );
  };
}
