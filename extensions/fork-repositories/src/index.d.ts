interface Category {
  id: number;
  name: string;
  parentId: number | null;
}

interface Repo {
  id: number;
  parentId: number | null;
  name: string;
  path: string;
  lastAccessTime: number;
}

interface RepoFile {
  categories: Category[];
  repositories: Repo[];
}
