import axios from 'axios';

const BRANCH = 'master';
const OWNER = 'harryheman';
const REPO = 'my-js';


const listClient = axios.create({
  baseURL: `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/eb6d6bc77e660b5641c9e2bc9ab1fc4f213e7014`,
});

const fileClient = axios.create({
    baseURL: `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}`,
});

interface ListResponse {
  sha: string;
  url: string;
  tree: File[];
}

export interface File {
  path: string;
  mode: string;
  type: 'tree' | 'blob';
  sha: string;
  size: number;
  url: string;
}

class Service {
  static async listFiles() {
    const response = await listClient.get<ListResponse>(``);
    return response.data.tree;
  }

  static async getSheet(slug: string) {
    const response = await fileClient.get<string>(`/docs/cheatsheet/${slug}.md`);
    return response.data;
  }
}

export default Service;
