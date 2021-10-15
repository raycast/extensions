import { Connection, entitiesColl, subscribeEntities } from "home-assistant-js-websocket";
import { useEffect, useRef, useState } from "react";
import { getHAWSConnection } from "./common";
import { State } from "./haapi";

export function useHAStates(): {
  states?: State[];
  error?: string;
  isLoading: boolean;
} {
  const [states, setStates] = useState<State[]>();
  const [error, setError] = useState<string>();
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
      } catch (e: any) {
        if (!cancel) {
          setError(e.toString());
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
