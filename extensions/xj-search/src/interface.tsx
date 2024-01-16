export interface Task {
  vars: { [key: string]: string };
  desc: string;
  cmd: string;
}

export interface YamlFile {
  vars: { namespace: string; icon?: string };
  tasks: { [key: string]: Task };
}

export interface UrlInfo {
  title: string;
  description?: string;
  icon: string;
  url: string;
}
