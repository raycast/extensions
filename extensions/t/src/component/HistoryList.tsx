import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { HistoryListItem } from "./HistoryListItem";

export const HistoryList: FunctionComponent<Props> = (props) => {
  const { items, onSelect, onDelete } = props;
  const cut = useCallback((values: string[]) => values.slice(0, 2), []);
  const [historyList, setHistoryList] = useState<string[]>([]);

  useEffect(() => {
    setHistoryList(cut(items));
  }, [items]);

  return (
    <>
      {historyList.map((item) => {
        return <HistoryListItem key={item} item={item} onSelect={onSelect} onDelete={onDelete} />;
      })}
    </>
  );
};

type Props = {
  onSelect(text: string): void;
  onDelete(text: string): void;
  items: string[];
};
