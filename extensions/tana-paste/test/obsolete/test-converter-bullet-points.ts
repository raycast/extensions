import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { convertToTana } from "../src/utils/tana-converter.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = path.join(__dirname, "test-bullet-points.md");
const outputFile = path.join(__dirname, "output-bullet-points.md");

const input = fs.readFileSync(inputFile, "utf8");
const output = convertToTana(input);

fs.writeFileSync(outputFile, output, "utf8");

console.log("Conversion complete. Output written to:", outputFile); 