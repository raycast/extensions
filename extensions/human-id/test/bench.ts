import { humanId } from "../src/human-id";

const N = 5_000_000;
for (const words of [3, 4, 5]) {
  for (let i = 0; i < 100_000; i++) humanId(words);
  const start = process.hrtime.bigint();
  for (let i = 0; i < N; i++) humanId(words);
  const ns = Number(process.hrtime.bigint() - start) / N;
  console.log(`${words} words: ${ns.toFixed(1)} ns/call  e.g. ${humanId(words)}`);
}
