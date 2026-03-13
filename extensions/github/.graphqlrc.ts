import * as dotenv from "dotenv";
dotenv.config();

export default {
  schema: [
    {
      "https://api.github.com/graphql": {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          "User-Agent": "Raycast",
        },
      },
    },
  ],
  documents: ["src/**/*.graphql"],
};
