import readline from "node:readline";
let count = 0;
readline.createInterface({ input: process.stdin }).on("line", (line) => {
  const args = JSON.parse(line);
  if (args[0] === "exit") return process.exit(0);
  if (args[0] === "fail") return console.log(JSON.stringify({ error: "Tab changed" }));
  console.log(JSON.stringify({ count: ++count, args }));
});
