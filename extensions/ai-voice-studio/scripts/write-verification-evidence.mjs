import { writeVerificationEvidence } from "./lib/verification-evidence.mjs";

const name = process.argv[2];
const allowed = new Set(["local-verify", "local-playback"]);

if (!allowed.has(name)) {
  console.error(`Usage: node scripts/write-verification-evidence.mjs ${Array.from(allowed).join("|")}`);
  process.exit(1);
}

const filePath = writeVerificationEvidence(process.cwd(), name, {
  command: name === "local-verify" ? "npm run verify" : "npm run verify:local-playback",
});

console.log(
  JSON.stringify(
    {
      evidence: filePath,
      recorded: name,
    },
    null,
    2,
  ),
);
