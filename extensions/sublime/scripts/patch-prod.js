import fs from "fs";

const obj = JSON.parse(fs.readFileSync("./package.json", "utf8"));

// Update metadata
obj.name = "sublime";
obj.title = "Sublime";
obj.icon = "icon.png";

// Enable some commands only in prod to stay below free team limit
obj.commands.push(
    {
        name: "open-library",
        title: "Open Library",
        description: "Open your Sublime Library",
        mode: "no-view",
    },
    {
        name: "save-text",
        title: "Save Text",
        description: "Save a text to Sublime",
        mode: "view",
    },
);

fs.writeFileSync("./package.json", JSON.stringify(obj, null, 4));

// Update constants
const constants = fs.readFileSync("./src/utils/constants.ts", "utf8");
fs.writeFileSync("./src/utils/constants.ts", constants.replace("const isStaging = true;", "const isStaging = false;"));
