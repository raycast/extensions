import React, { useCallback, useState } from "react";
import fetch from "node-fetch";

/**
 * Is this sort of useless and could be integrated into useJotobaAsync? Yes.
 */
const useFetchAsync = (
  baseUrl: string
): ((config: { [arg0: string]: any }, callback: (...args: any) => any) => void) => {
  const rqUrl = baseUrl;

  const sendRq = useCallback(async (config = { method: "GET" }) => {
    let res;
    if (!config) throw new Error("Not configured.");

    if (config.method === "GET") res = await fetch(rqUrl);
    else if (config.method !== "GET") {
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
      Promise.reject("Could not get data from server.");
      return;
    }

    return await res.json();
  }, []);

  return sendRq;
};

export default useFetchAsync;
