#!/usr/bin/env node
const mode = process.argv[2];
if (mode === "scope-service") { console.log(JSON.stringify({event:"scope",excluded:0})); console.log(JSON.stringify({event:"done"})); }
else if (mode === "search-service") {
  const { createInterface } = await import("node:readline");
  createInterface({input: process.stdin}).on("line", (line) => {
    const request = JSON.parse(line);
    if (request.op === "stat") return console.log(JSON.stringify(request.paths.length > 100000 ? {id:request.id,error:"too many metadata paths"} : {id:request.id,files:[]}));
    const root = process.argv.find((arg) => arg.includes("large-catalog-"));
    const hits = request.op === "files" && root ? Array(150000).fill({ path: root + "/example.ts", kind: "code", segment: "name", segment_id: 0, modified: 1, size: 1, info: {} }) : [];
    console.log(JSON.stringify({id: request.id, hits, strong: hits.length, meaning: false}));
  });
}
else if (mode === "invalid") process.stdout.write("invalid json\n");
else if (mode === "fail") {
  console.log(JSON.stringify({ event: "error", message: "Test job failed" }));
  process.exitCode = 1;
} else if (mode === "wait") setInterval(() => {}, 1000);
else if (mode === "cooperate") {
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (data) => {
    if (data.includes("stop\n")) {
      console.log(JSON.stringify({ event: "done", saved: true }));
      process.exit(0);
    }
  });
}
else console.log(JSON.stringify({ event: "done" }));
