import fs from "fs";

import generateEntryFile from "./generateEntryFile";
import generatePackageEntry from "./generatePackageEntry";

function removeAllTsxFiles() {
  fs.readdirSync('./src').forEach(file => {
    if (file.endsWith('.tsx')) {
      fs.unlinkSync(`./src/${file}`)
    }
  })
}

removeAllTsxFiles()
console.log("Delete: remove ALL tsx files done.");
generateEntryFile()
console.log("Generate: GenerateEntryFile done.");
generatePackageEntry()
console.log("Generate: GeneratePackageEntry done.");
