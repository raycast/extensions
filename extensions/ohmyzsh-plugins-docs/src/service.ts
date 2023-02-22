import axios from "axios";

const BASE_URL = "https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/plugins/";

const pluginsClient = axios.create({
  baseURL: "https://api.github.com/repos/ohmyzsh/ohmyzsh/contents/plugins",
});

interface Heading {
  title?: string | undefined;
  level?: number | undefined;
  markdown?: string | undefined;
}

interface Section {
  name: string;
  level: number;
  content: string | null;
  type: "Detail" | "List";
}

interface Plugin {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
  _links: {
    self: string;
    git: string;
    html: string;
  };
  headings: Heading[];
}

interface File {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

class Service {
  static async listPlugins() {
    const response = await pluginsClient.get("");
    const plugins = response.data.map((plugin: Plugin) => {
      return {
        name: plugin.name,
        path: plugin.path,
        sha: plugin.sha,
        size: plugin.size,
        url: plugin.url,
        html_url: plugin.html_url,
        git_url: plugin.git_url,
        download_url: plugin.download_url,
        type: plugin.type,
        _links: plugin._links,
      };
    });

    return plugins;
  }

  static async listFiles(plugin: Plugin) {
    const response = await pluginsClient.get(plugin.url);
    const files = response.data.map((file: File) => {
      return {
        name: file.name,
        path: file.path,
        sha: file.sha,
        size: file.size,
        url: file.url,
        html_url: file.html_url,
        git_url: file.git_url,
        download_url: file.download_url,
        type: file.type,
        _links: file._links,
      };
    });

    return files;
  }

  static async getFileContent(file: File) {
    const response = await axios.get(file.download_url);
    return response.data;
  }

  static async getReadme(plugin: Plugin) {
    const response = await axios.get(`${BASE_URL}/${plugin.name}/README.md`);
    // const headings = getHeadings(response.data);
    return response.data;
  }

  static async getZsh(plugin: Plugin) {
    const response = await axios.get(`${BASE_URL}/${plugin.name}/${plugin.name}.plugin.zsh`);
    // const headings = getHeadings(response.data);
    return response.data;
  }
}

export default Service;
export type { Plugin, File, Section };
