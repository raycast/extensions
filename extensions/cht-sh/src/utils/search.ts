import Fuse from "fuse.js";

function searchStringArray(array: string[], search: string) {
  const fuse = new Fuse(array, {});
  return fuse.search(search).map((result) => result.item);
}

export default searchStringArray;
