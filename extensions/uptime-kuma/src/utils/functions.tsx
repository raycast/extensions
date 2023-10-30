import UptimeKuma from "../modules/UptimeKuma";

export function getToken(url: string, username: string, password: string, code: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const kuma = new UptimeKuma(url);

    kuma.on("connected", () => {
      kuma.getToken(username, password, code);
    });

    kuma.on("token", (token) => {
      kuma.disconnect();
      resolve(token);
    });

    kuma.on("error", (error) => {
      kuma.disconnect();
      reject(error);
    });

    kuma.connect();
  });
}

export function checkUrl(url: string) {
  return new Promise((resolve, reject) => {
    const checker = new UptimeKuma(url);

    checker.on("connected", () => {
      resolve(true);
      checker.disconnect();
    });

    checker.on("error", (error) => {
      reject(error);
      checker.disconnect();
    });

    checker.connect();
  });
}
