const nodeEnv = process.env.NODE_ENV as unknown as "development" | "production";

// todo:
// - check process.env.NODE_ENV in production

if (!["development", "production"].includes(nodeEnv)) throw new Error(`Invalid NODE_ENV: ${nodeEnv}`);

const allConfigs = {
  development: {
    apiURL: "http://localhost:8787/api",
    lpURL: "http://localhost:3001",
    weURL: "chrome-extension://gfmbkbpbncjopblehgldppphpkcmehnk/settings.html",
  },
  production: {
    apiURL: "https://lingorep.com/api",
    lpURL: "https://lingorep.com",
    weURL: "chrome-extension://gfmbkbpbncjopblehgldppphpkcmehnk/settings.html",
  },
};

export const config = allConfigs[nodeEnv];
