import { useEffect, useRef, useState } from "react";

import config from "../config.json";
import getLanguages from "./getLanguages";
import { QueryOptionResult, QueryOptions } from "./types";

type AutoCompleteHookProps = {
  prefix?: string;
  query: string;
  queryOptions?: QueryOptions;
  optionsFunc?: (key: string) => QueryOptions;
};

const useAutoComplete = ({ query, prefix = "-" }: AutoCompleteHookProps) => {
  const langOptions = getLanguages();
  const keys = query.slice(1).split(" ");
  const results = useRef<QueryOptionResult[]>([]);
  const [serializedRts, setSerializedRts] = useState("");
  const traverse = (queryOptions: QueryOptions, currKeyIndex: number, keyChain: string[]): void => {
    const currKey = keys[currKeyIndex];
    let possible = Object.keys(queryOptions).filter((token) => token === currKey);
    possible = possible.length
      ? possible
      : Object.keys(queryOptions).filter(
          (token) =>
            token.includes(currKey) ||
            (!queryOptions[token].strict && queryOptions[token].title.toLowerCase().includes(currKey))
        );
    if (!currKey || !possible.length) {
      Object.entries(queryOptions).forEach((entry) => {
        const [key, queryOption] = entry;
        const { options, optionsFunc, ...resOpts } = queryOption;
        results.current.push({
          ...resOpts,
          query: prefix + [...keyChain, key].join(" "),
          isFinal: !optionsFunc && !Object.keys(options || {}).length,
        });
      });
      return;
    }
    const matched = possible.length === 1 && possible[0];
    if (matched && currKeyIndex < keys.length - 1) {
      if (queryOptions[matched].options) {
        keyChain.push(matched);
        return traverse(queryOptions[matched].options || {}, currKeyIndex + 1, [...keyChain]);
      } else if (queryOptions[matched].optionsFunc === "langOptions") {
        // && optionsFunc
        keyChain.push(matched);
        return traverse(langOptions || {}, currKeyIndex + 1, [...keyChain]);
      }
    }
    possible.forEach((token) => {
      const { options, optionsFunc, ...resOpts } = queryOptions[token];
      const possibleCommand = {
        ...resOpts,
        query: prefix + [...keyChain, token].join(" "),
        isFinal: !optionsFunc && !Object.keys(options || {}).length,
      };
      results.current.push(possibleCommand);
    });
  };
  useEffect(() => {
    results.current = [];
    if (query.startsWith(prefix)) {
      traverse(config, 0, []);

      const serializeRts = results.current.map((result) => result.query).join(", ");
      setSerializedRts(serializeRts);
    } else if (serializedRts) setSerializedRts("");
  }, [query]);
  return results.current;
};

export default useAutoComplete;
