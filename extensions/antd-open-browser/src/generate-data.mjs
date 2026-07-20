import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { matter } from "md-front-matter";

const languages = ["en-US", "zh-CN"];

const componentsFolder = resolve("./repository/components/");

const components = readdirSync(componentsFolder, { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory() && !dirent.name.startsWith("_"))
  .map((dirent) => ({
    directory: join(componentsFolder, dirent.name),
    component: dirent.name,
  }));

const records = {
  [languages[0]]: {},
  [languages[1]]: {},
};

const suffix = {
  [languages[0]]: "",
  [languages[1]]: "-cn",
};

for (const { component, directory } of components) {
  for (const language of languages) {
    const filePath = join(directory, `index.${language}.md`);
    try {
      const content = readFileSync(filePath, "utf8");
      const {
        data: { group, title, subtitle, cover, coverDark, description },
      } = matter(content);

      const groupTitle = typeof group === "string" ? group : group.title;

      if (!records[language][groupTitle]) {
        records[language][groupTitle] = {
          title: groupTitle,
          items: [],
        };
      }

      records[language][groupTitle].items.push({
        title,
        subtitle,
        cover,
        coverDark,
        description,
        documentation: `https://ant.design/components/${component}${suffix[language]}`,
      });
    } catch {
      console.error(`No docs for ${directory} for ${language}:`);
    }
  }
}

for (const [language, data] of Object.entries(records)) {
  const jsonContent = JSON.stringify(Object.values(data), null, 4) + "\n";

  writeFileSync(`src/data.${language}.json`, jsonContent);
}
