import NodeID3 from "node-id3";

export function readID3Tags(path: string) {
  return NodeID3.read(path);
}

export function updateID3Tags(tags: NodeID3.Tags, path: string) {
  return NodeID3.update(tags, path);
}

export function writeID3Tags(tags: NodeID3.Tags, path: string) {
  return NodeID3.write(tags, path);
}
