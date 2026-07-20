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

const urlV2 = "https://v2.chakra-ui.com/docs/components";
const urlV3 = "https://chakra-ui.com/docs/components/concepts/overview";

const fetchHtml = async (url: string): Promise<string> => {
  const { data } = await axios.get(url);
  return data;
};

const scrapeComponentsV2 = async (): Promise<Section> => {
  const html = await fetchHtml(urlV2);
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
      const componentLink = "https://v2.chakra-ui.com" + ($(componentElement).attr("href") || "");
      components.push({ url: componentLink, title: componentName });
    });
    
    sections[sectionName] = components;
  });
  
  return sections;
};

const scrapeComponentsV3 = async (): Promise<Section> => {
  const html = await fetchHtml(urlV3);
  const $ = cheerio.load(html);
  const sidebar = $("aside .chakra-stack");

  if (sidebar.length === 0) {
    throw new Error("Sidebar not found. Please check the HTML structure and ensure the correct selector is used.");
  }

  const sections: Section = {};

  sidebar.children("div").each((_, sectionElement) => {
    const sectionName = $(sectionElement).children("div").first().text();
    const components: Component[] = [];

    $(sectionElement)
      .children("div")
      .find("a")
      .each((_, componentElement) => {
        const componentName = $(componentElement).text();
        const componentLink = "https://chakra-ui.com" + ($(componentElement).attr("href") || "");
        components.push({ url: componentLink, title: componentName });
      });

    sections[sectionName] = components;
  });

  return sections;
};

const scrapeComponents = async () => {
  const [v2, v3] = await Promise.all([scrapeComponentsV2(), scrapeComponentsV3()]);
  return {v2, v3};
}

const generateFile = (sections: {[v:string]: Section}): void => {
  const content = `export default ${JSON.stringify(sections, null, 2)};`;
  fs.writeFileSync("./src/documentation/componentsDocs.tsx", content);
};

scrapeComponents()
  .then((sections) => generateFile(sections))
  .catch((error) => console.error("Error:", error.message));
