let nodeEnv = process.env.NODE_ENV as unknown as "development" | "production" | undefined;

if (nodeEnv !== "development") nodeEnv = "production";
console.log("node env", nodeEnv);

const allConfigs = {
  development: {
    apiURL: "http://localhost:8787/v1",
    lpURL: "http://localhost:3001",
    weURL: "chrome-extension://lgcnkaedeeaalllmgmbdlfcfjjdfapid/settings.html",
  },
  production: {
    apiURL: "https://api.lingorep.com/v1",
    lpURL: "https://lingorep.com",
    weURL: "chrome-extension://gfmbkbpbncjopblehgldppphpkcmehnk/settings.html",
  },
};
// test

export const config = allConfigs[nodeEnv];
