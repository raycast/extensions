const https = require("https");
const fs = require("fs");

https
  .get("https://raw.githubusercontent.com/github/gemoji/v3.0.1/db/emoji.json", (resp) => {
    let data = "";

    resp.on("data", (chunk) => {
      data += chunk;
    });

    resp.on("end", () => {
      const json = JSON.parse(data);
      const emojis = {};
      for (const obj of json) {
        const symbol = obj.emoji;
        if (!symbol) {
          continue;
        }
        const aliases = obj.aliases;
        for (const alias of aliases) {
          emojis[alias] = symbol;
        }
      }
      console.log(emojis);
      const filep = `${__dirname}/../src/components/status/emojis.json`;
      fs.writeFileSync(filep, JSON.stringify(emojis, null, 2));
    });
  })
  .on("error", (err) => {
    console.error(err);
  });
