import axios from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";

interface Component {
  url: string;
  title: string;
}

interface Section {
  [key: string]: Component[];
}

const url = "https://chakra-ui.com/docs/components";

const fetchHtml = async (url: string): Promise<string> => {
  const { data } = await axios.get(url);
  return data;
};

const scrapeComponents = async (): Promise<Section> => {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const sidebar = $(".sidebar-content");

  if (sidebar.length === 0) {
    throw new Error("Sidebar not found. Please check the HTML structure and ensure the correct selector is used.");
  }

  const sections: Section = {};

  sidebar.children("div").each((_, sectionElement) => {
    const sectionName = $(sectionElement).children("p").text();
    const components: Component[] = [];

    $(sectionElement)
      .children("div")
      .find("a")
      .each((_, componentElement) => {
        const componentName = $(componentElement).find("span").text();
        const componentLink = "https://chakra-ui.com" + ($(componentElement).attr("href") || "");
        components.push({ url: componentLink, title: componentName });
      });

    sections[sectionName] = components;
  });

  return sections;
};

const generateFile = (sections: Section): void => {
  let content = "export default {\n";

  for (const [section, components] of Object.entries(sections)) {
    content += `  "${section}": [\n`;
    for (const component of components) {
      content += `    {\n`;
      content += `      url: "${component.url}",\n`;
      content += `      title: "${component.title}",\n`;
      content += `    },\n`;
    }
    content += `  ],\n`;
  }

  content += "};\n";

  fs.writeFileSync("./src/documentation/componentsDocs.tsx", content);
};

scrapeComponents()
  .then((sections) => generateFile(sections))
  .catch((error) => console.error("Error:", error.message));
