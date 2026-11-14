import { useEffect, useState } from "react";
import { BearDb, loadDatabase } from "./bear-db";

export function useBearDb(): [BearDb | undefined, Error | undefined] {
  const [db, setDb] = useState<BearDb>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let disposed = false;
    let connection: BearDb | undefined;
    const connect = async () => {
      try {
        connection = await loadDatabase();
        if (disposed) connection.close();
        else setDb(connection);
      } catch {
        if (!disposed) setError(new Error("Couldn't load Bear database. Make sure you have Bear installed."));
      }
    };
    connect();

    return () => {
      disposed = true;
      connection?.close();
      connection = undefined;
    };
  }, []);

  return [db, error];
}
