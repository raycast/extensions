import { execFileSync } from "node:child_process";
import manifest from "../package.json";

const url = new URL(`raycast://extensions/${manifest.author}/${manifest.name}/app-hopper`);
url.searchParams.set("context", JSON.stringify({ preview: "loading" }));
execFileSync("/usr/bin/open", [url.toString()], { stdio: "inherit" });
console.log("Loading preview opened in Raycast. Press Esc to leave; open App Hopper normally to use the app.");
