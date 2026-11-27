import useLocalStorage from "@/hooks/useLocalStorage";

type Layout = { order: string[]; hidden: string[] };

// Device ids can differ in case between LAN and cloud; scenario ids are nanoids.
const key = (id: string) => id.toLowerCase();

/** User-defined order and visibility of list rows (devices and scenarios). */
const useLayout = () => {
  const { data, setData, isLoading } = useLocalStorage<Layout>("layout", { order: [], hidden: [] });
  const layout = data ?? { order: [], hidden: [] };

  const isHidden = (id: string) => layout.hidden.includes(key(id));

  /** Rows in the saved order; rows never moved keep their original order, after the moved ones. */
  const sort = <T extends { id: string }>(items: T[]) => {
    const rank = (id: string) => {
      const i = layout.order.indexOf(key(id));
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    return items
      .map((item, i) => ({ item, i }))
      .sort((a, b) => rank(a.item.id) - rank(b.item.id) || a.i - b.i)
      .map(({ item }) => item);
  };

  /** Swap `id` with its neighbour inside `ids` (the rows as currently displayed in one section). */
  const move = (ids: string[], id: string, delta: -1 | 1) => {
    const next = ids.map(key);
    const from = next.indexOf(key(id));
    const to = from + delta;
    if (from === -1 || to < 0 || to >= next.length) return;
    [next[from], next[to]] = [next[to], next[from]];
    setData((l) => ({ ...l, order: [...next, ...l.order.filter((x) => !next.includes(x))] }));
  };

  const toggleHidden = (id: string) =>
    setData((l) => ({
      ...l,
      hidden: l.hidden.includes(key(id)) ? l.hidden.filter((x) => x !== key(id)) : [...l.hidden, key(id)],
    }));

  return { isHidden, sort, move, toggleHidden, isLoading };
};

export default useLayout;
