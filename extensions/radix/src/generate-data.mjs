import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import matter from "gray-matter";

["primitives", "themes", "colors"].forEach((product) => {
  const routes = JSON.parse(
    execSync(`node --experimental-strip-types src/extract-routes.mjs ${product}`, { encoding: "utf8" }),
  );
  const records = [];

  for (const route of routes) {
    const category = {
      title: route.label,
      items: [],
    };

    for (const page of route.pages) {
      const item = {
        title: page.title,
        documentation: `https://www.radix-ui.com/${page.slug}`,
      };

      try {
        const fileContent = readFileSync(`./repository/data/${page.slug}.mdx`, "utf8");
        const { data, content } = matter(fileContent);

        const match = content.match(/<Description>([^<]*?)<\/Description>/);

        item.description = match ? match[1].trim() : data.metaDescription;
      } catch (error) {
        console.error(error);
      }

      category.items.push(item);
    }

    if (category.items.length > 0) {
      records.push(category);
    }
  }

  writeFileSync(`src/data.${product}.json`, JSON.stringify(records, null, 2) + "\n");
});
