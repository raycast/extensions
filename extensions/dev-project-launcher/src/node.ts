import { readdirSync, statSync } from "fs";
import { readdir } from "fs/promises";

export type NodeType = "DIR" | "FILE" | "IMG";
export type Node = {
  name: string;
  absolutePath: string;
};

export const retrieveNodesSync = (rootDir: string) => {
  return readdirSync(rootDir).map((path) => ({ name: path, absolutePath: `${rootDir}/${path}` }));
};

export const retrieveNodes = async (rootDir: string) => {
  return (await readdir(rootDir)).map((path) => ({ name: path, absolutePath: `${rootDir}/${path}` }));
};

export const getNodeType = (node: Node): NodeType => {
  if (statSync(node.absolutePath).isDirectory()) return "DIR";
  if (["png", "jpg", "jpeg", "gif", "svg"].includes(node.absolutePath.split(".").pop() || "")) return "IMG";
  return "FILE";
};
