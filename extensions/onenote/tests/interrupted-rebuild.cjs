const { createFixture } = require("./database-fixture.cjs");

process.on("disconnect", () => process.exit());

createFixture({
  root: process.argv[2],
  execute: async ({ execute }) => {
    await execute();
    process.send("indexed");
    await new Promise(() => {});
  },
})
  .then((fixture) => fixture.create_or_update_db(true))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
