// Types and interfaces

export interface Task {
  vars: { [key: string]: string };
  desc: string;
  cmd: string;
}
