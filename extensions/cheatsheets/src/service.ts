import axios from 'axios';

const BRANCH = 'master';
const OWNER = 'rstacruz';
const REPO = 'cheatsheets';

const listClient = axios.create({
  baseURL: `https://api.github.com/repos/${OWNER}/${REPO}/git/trees`,
});

const fileClient = axios.create({
  baseURL: `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}`,
});

interface ListResponse {
  sha: string;
  url: string;
  tree: File[];
}

interface File {
  path: string;
  mode: string;
  type: 'tree' | 'blob';
  sha: string;
  size: number;
  url: string;
}

class Service {
  static async listFiles() {
    const response = await listClient.get<ListResponse>(`/${BRANCH}`);
    return response.data.tree;
  }

  static async getSheet(slug: string) {
    const response = await fileClient.get<string>(`/${slug}.md`);
    return response.data;
  }

  static urlFor(slug: string) {
    return `https://devhints.io/${slug}`;
  }
}

export default Service;
export type { File };
