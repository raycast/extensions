import React, { useCallback, useState } from "react";
import fetch from "node-fetch";

/**
 * Is this sort of useless and could be integrated into useJotobaAsync? Yes.
 */
const useFetchAsync = (
  baseUrl: string,
): ((config: fetchAsyncConfig, callback: (results: JotobaResults) => Promise<JotobaResults>) => Promise<Json>) => {
  const rqUrl = baseUrl;

  return useCallback(async (config = { method: "GET" }) => {
    let res;
    if (!config) throw new Error("Not configured.");

    if (config.method === "GET") res = await fetch(rqUrl);
    else {
      res = await fetch(rqUrl, {
        method: config.method,
        signal: config.signal || undefined,
        headers: {
          "Content-Type": "application/json",
        },
        referrerPolicy: "no-referrer",
        body: JSON.stringify(config.bodyData),
      });
    }

    if (typeof res === "undefined" || !res.ok) {
      return Promise.reject("Could not get data from server.");
    }

    return await res.json();
  }, []);
};

export default useFetchAsync;
