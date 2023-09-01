import { readFileSync, writeFileSync } from "fs";

const txt = readFileSync('alias.txt', "utf8");

// Get all lines that contain an equal sign
const lines = txt.split('\n').filter((line) => line.includes('='));

const output = lines.map((line) => {
  // Split the line into two parts, the name and the command
  let [, name, command] = line.match(/^(.*?)=(.*)$/);

  // Remove starting and ending quotes
  command = command.replace(/^'(.*)'$/, '$1');

  return { name, command };
});

writeFileSync('../src/alias.json', JSON.stringify(output, null, 2));