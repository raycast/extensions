import { useEffect, useState } from "react";
import getConfigHosts, { configToConnection } from "../helpers/getConfigHosts";
import buildSubtitle from "../helpers/buildSubtitle";
import { ISSHConnection } from "../types";
import { nanoid } from "nanoid";

/**
 *
 * @param disabled When disabled - always returns an empty array as hosts
 * @returns
 */
export default function useSSHConfigHosts(disabled: boolean): { hosts: ISSHConnection[]; isLoading: boolean } {
  const [isLoading, setIsLoading] = useState(false);
  const [hosts, setHosts] = useState<ISSHConnection[]>([]);

  useEffect(() => {
    if (disabled) {
      setHosts([]);
    } else {
      setIsLoading(true);
      getConfigHosts().then((configHosts) => {
        setHosts(() =>
          Object.keys(configHosts).map((host) => {
            return {
              id: nanoid(),
              name: host,
              address: host,
              subtitle: buildSubtitle(configToConnection(configHosts[host], host)), // Pass a dummy ISSHConnection to build the subtitle
            } as ISSHConnection;
          })
        );
      });
    }
    setIsLoading(false);
  }, [disabled]);

  return { hosts, isLoading };
}
