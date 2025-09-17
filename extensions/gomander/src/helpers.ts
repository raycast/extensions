const START_PORT = 9001;
const END_PORT = 9100;

export const scanForPort = async (): Promise<number> => {
  for (let port = START_PORT; port <= END_PORT; port++) {
    try {
      const response = await fetch(`http://localhost:${port}/discovery`, { method: "GET" });

      if (response.ok) {
        const body = (await response.json()) as { app: string };
        if (body.app === "Gomander") {
          return port;
        }
      }
    } catch {
      // Do nothing
    }
  }
  throw new Error("No available ports found");
};
