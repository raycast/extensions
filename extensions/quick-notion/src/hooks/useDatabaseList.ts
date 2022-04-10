import { UpsertedDatabase } from "src/types";
import { atom, useAtom } from "jotai";
import { useEffect } from "react";
import { useStorage } from "./useStorage";

const databases = atom<UpsertedDatabase[]>([]);

export const useDatabaseList = () => {
  const { items } = useStorage();
  const [databaseList, setDatabaseList] = useAtom(databases);

  useEffect(() => {
    const databaseIds = Object.keys(items).filter((key) => key !== "previousSelectedDatabaseId");
    const databaseList: UpsertedDatabase[] = databaseIds.map((id) => JSON.parse(items[id]));
    setDatabaseList(databaseList);
  }, [items]);

  return { databaseList, setDatabaseList };
};
