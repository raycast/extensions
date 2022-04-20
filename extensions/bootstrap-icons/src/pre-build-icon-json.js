import * as fs from "fs";

async function main() {
  // 1: remove all the old icons
  await fs.rmdirSync(`assets/icons/`, { recursive: true });

  // 2: create ions dir
  await fs.mkdirSync(`assets/icons/`);

  // 3: read and sync icons from node-modules
  fs.readdir("node_modules/bootstrap-icons/icons/", async (err, files) => {
    if (err) {
      throw err;
    }
    const contents = await Promise.all(
      files
        .filter((file) => file.endsWith(".svg"))
        .map(async (file) => {
          await fs.copyFileSync(`node_modules/bootstrap-icons/icons/${file}`, `assets/icons/${file}`);
          return {
            name: file.slice(0, -4),
            svg: await fs.readFileSync(`node_modules/bootstrap-icons/icons/${file}`, "utf8"),
          };
        })
    );

    contents.sort((a, b) => a.name.localeCompare(b.name));

    await fs.writeFileSync("src/icons.json", `${JSON.stringify(contents, null, 2)}`);
  });
}

main();
