import { useEffect, useState } from "react";
import { BearDb, loadDatabase } from "./bear-db";

export function useBearDb(): [BearDb | undefined, Error | undefined] {
  const [db, setDb] = useState<BearDb>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    const connect = async () => {
      try {
        setDb(await loadDatabase());
      } catch (err: any) {
        setError(new Error("Couldn't load Bear database. Make sure you have Bear installed."));
      }
    };
    connect();

    return () => db?.close();
  }, []);

  return [db, error];
}
