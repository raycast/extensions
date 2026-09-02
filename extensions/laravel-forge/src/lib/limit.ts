// Forge rate-limits per token; every request in the extension goes through here
const MAX_IN_FLIGHT = 5;
const RETRIES = 2;

let inFlight = 0;
const waiting: Array<() => void> = [];

const acquire = () =>
  new Promise<void>((resolve) => {
    const start = () => {
      inFlight++;
      resolve();
    };
    if (inFlight < MAX_IN_FLIGHT) start();
    else waiting.push(start);
  });

const release = () => {
  inFlight--;
  waiting.shift()?.();
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A 429 was not processed, so retrying any verb is safe
// Sleeping inside the slot would idle a fifth of the pool for up to 15s
export const politeFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  for (let attempt = 0; ; attempt++) {
    await acquire();
    let res: Response;
    try {
      res = await fetch(url, options);
    } finally {
      release();
    }
    if (res.status !== 429 || attempt >= RETRIES) return res;
    const after = Number(res.headers.get("retry-after")) || 2 ** attempt;
    await wait(Math.min(after, 15) * 1000);
  }
};
