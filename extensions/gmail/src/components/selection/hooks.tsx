import { useState } from "react";
import { ListSelectionController } from "./utils";
import { gmail_v1 } from "@googleapis/gmail";

export function useListSelection<T>(args: { data: T[] | undefined; key: (element: T) => string }) {
  const [selected, setSelected] = useState<string[]>([]);
  const includes = (el: T) => selected.includes(args.key(el));
  const selectionController: ListSelectionController<T> = {
    select(element: T) {
      if (!includes(element)) {
        setSelected([...selected, args.key(element)]);
      }
    },
    deselect(element: T) {
      if (includes(element)) {
        const na = [...selected];
        const f = na.filter((e) => e !== args.key(element));
        setSelected(f);
      }
    },
    deselectAll() {
      setSelected([]);
    },
    isSelected: (e) => includes(e),
    getSelected() {
      const result: T[] = [];
      for (const sk of selected) {
        const o = args.data?.find((v) => args.key(v) === sk);
        if (o) {
          result.push(o);
        }
      }
      return result;
    },
    getSelectedKeys: () => selected,
  };
  return { selected, selectionController };
}

export function useMessageListSelection(data: gmail_v1.Schema$Message[] | undefined) {
  const result = useListSelection<gmail_v1.Schema$Message>({
    data,
    key: (e) => e.id || "?",
  });
  return result;
}
