import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { ItemType } from "./type";

export const useDoc = () => {
  const docsDirectory = path.join(__dirname, "assets", "docs");
  const result: { sections: { sectionTitle: string; items: ItemType[] }[] } = { sections: [] };

  function processDirectory(directory: string) {
    const items = fs.readdirSync(directory);

    items.forEach((item) => {
      const fullPath = path.join(directory, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        processDirectory(fullPath);
      } else if (item.endsWith(".mdx")) {
        const fileContents = fs.readFileSync(fullPath, "utf8");
        const { data, content } = matter(fileContents);
        const category = data.category;

        if (data.category && !category.includes("Internal only")) {
          const existingSection = result.sections.find((section) => section.sectionTitle === category);
          if (!existingSection) {
            result.sections.push({ sectionTitle: category, items: [] });
          }
          const sectionIndex = result.sections.findIndex((section) => section.sectionTitle === category);
          result.sections[sectionIndex].items.push({
            ...data,
            path: `https://polaris.shopify.com/components/${path
              .relative(docsDirectory, fullPath)
              .replace(/\\/g, "/")
              .replace(/\.mdx$/, "")}`,
            title: data.title || "",
            shortDescription: data.shortDescription || "",
            category: data.category,
            keywords: data.keywords,
            previewImg: `file:///${__dirname}/assets/${data.previewImg}`,
            content: content
              .replaceAll("<DoDont>", "")
              .replaceAll("</DoDont>", "")
              .replaceAll("<Lede>", "")
              .replaceAll("</Lede>", "")
              .replaceAll("<Examples />", "")
              .replaceAll("<kbd>", "")
              .replaceAll("</kbd>", "")
              .replaceAll("<Props componentName={frontmatter.title} />", "")
              .replace("# {frontmatter.title}", "")
              .replaceAll("(/images/components/", `(file:///${__dirname}/assets/images/components/`)
              .replaceAll("<StatusBanner status={frontmatter.status}>", "### Warning")
              .replaceAll("</StatusBanner>", "")
              .replaceAll('<TipBanner title="Tip">', "### Tip")
              .replaceAll("</TipBanner>", ""),
          });
        }
      }
    });
  }

  processDirectory(docsDirectory);

  result.sections.sort((a, b) => {
    if (a.sectionTitle === "Deprecated") return 1;
    if (b.sectionTitle === "Deprecated") return -1;
    return 0;
  });

  return {
    result,
  };
};
