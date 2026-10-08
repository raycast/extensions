import { Cache } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useMemo } from "react";

type NamedPortInfo = { name: string };
type NamedPortRecord = Record<number, NamedPortInfo>;

class NamedPortAlreadyExistsError extends Error {
  constructor(port: number) {
    super(`Named port "${port}" already exists`);
  }
}

const NAMED_PORTS_CACHE_KEY = "named-ports";

const cache = new Cache();

function getNamedPorts(): NamedPortRecord {
  const cached = cache.get(NAMED_PORTS_CACHE_KEY);

  if (cached === undefined) {
    return {};
  }

  return JSON.parse(cached);
}

function useNamedPorts() {
  const [namedPorts, setNamedPorts] = useCachedState<Record<number, NamedPortInfo>>(NAMED_PORTS_CACHE_KEY, {});

  const updateNamedPort = (port: number, info: NamedPortInfo) => {
    setNamedPorts((prev) => {
      const next = {
        ...prev,
        [port]: info,
      };

      return next;
    });
  };

  const createNamedPort = (port: number, info: NamedPortInfo) => {
    if (namedPorts[port] !== undefined) {
      throw new NamedPortAlreadyExistsError(port);
    }

    setNamedPorts((prev) => {
      const next = {
        ...prev,
        [port]: info,
      };

      return next;
    });
  };

  const deleteNamedPort = (port: number) => {
    setNamedPorts((prev) => {
      const next = {
        ...prev,
      };

      delete next[port];

      return next;
    });
  };

  const getNamedPort = (port: number): NamedPortInfo | undefined => {
    return namedPorts[port];
  };

  const allNamedPorts = useMemo(() => {
    return Array.from(Object.entries(namedPorts)).map(([port, info]) => [parseInt(port), info] as const);
  }, [namedPorts]);

  return {
    updateNamedPort,
    createNamedPort,
    deleteNamedPort,
    getNamedPort,
    allNamedPorts,
  };
}

export { NamedPortAlreadyExistsError, getNamedPorts, useNamedPorts, type NamedPortInfo };
