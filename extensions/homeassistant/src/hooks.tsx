import { Connection, entitiesColl, subscribeEntities } from "home-assistant-js-websocket";
import { useEffect, useRef, useState } from "react";
import { getHAWSConnection } from "./common";
import { State } from "./haapi";

export function useHAStates(): {
  states?: State[];
  error?: Error;
  isLoading: boolean;
} {
  const [states, setStates] = useState<State[]>();
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const hawsRef = useRef<Connection>();

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      if (cancel) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        if (!hawsRef.current) {
          const con = await getHAWSConnection();

          subscribeEntities(con, (entities) => {
            console.log("incoming entities changes");
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const haStates = Object.entries(entities).map(([k, v]) => v as State);
            if (!cancel) {
              console.log("set new entities");
              setStates(haStates);
            }
            setIsLoading(false);
          });
          hawsRef.current = con;
        } else {
          const entColl = entitiesColl(hawsRef.current);
          await entColl.refresh();
        }
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (!cancel) {
          const err = e instanceof Error ? e : new Error(e);
          setError(err);
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, []);

  return { states, error, isLoading };
}
