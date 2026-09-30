import fetch from "node-fetch";

export const pingjoplin = async () => {
  const port = { port: 0 };
  for (let portToTest = 41183; portToTest <= 41194; portToTest++) {
    const result = await fetch(`http://127.0.0.1:${portToTest}/ping`, { method: "GET" })
      .then((res) => {
        if (!res.ok && res.body === null) {
          throw new Error("Error pinging Joplin");
        }
        return res.body?.read().toString();
      })
      .catch(() => false);

    if (result == "JoplinClipperServer") {
      port.port = portToTest;
      break;
    }
  }
  return port.port;
};
