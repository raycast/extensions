// One-off write test: reopens a support case and posts an agent reply to it, then reads it
// back to see how the reply is stored and who it is attributed to. Only runs against a case
// listed in OUTSETA_WRITE_ALLOWLIST. Responses are saved to fixtures/raw/ (gitignored).
//
// Usage: OUTSETA_WRITE_ALLOWLIST=<caseUid> node scripts/reply-test.ts <caseUid> --confirm

import { writeFileSync } from "node:fs";

process.loadEnvFile(".env");

const { OUTSETA_SUBDOMAIN, OUTSETA_API_KEY, OUTSETA_SECRET_KEY } = process.env;
const allowlist = (process.env.OUTSETA_WRITE_ALLOWLIST ?? "").split(",").filter(Boolean);
const caseUid = process.argv[2];

if (!caseUid || !process.argv.includes("--confirm")) {
  throw new Error("Usage: node scripts/reply-test.ts <caseUid> --confirm");
}
if (!allowlist.includes(caseUid)) {
  throw new Error(`Case ${caseUid} is not in OUTSETA_WRITE_ALLOWLIST; refusing to write.`);
}

const baseUrl = `https://${OUTSETA_SUBDOMAIN}.outseta.com/api/v1`;

async function request(method: string, path: string, body?: unknown) {
  const res = await fetch(baseUrl + path, {
    method,
    headers: {
      Authorization: `Outseta ${OUTSETA_API_KEY}:${OUTSETA_SECRET_KEY}`,
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // keep raw text
  }
  console.log(`${res.status} ${method} ${path}`);
  return { status: res.status, body: parsed };
}

async function main() {
  const casePath = `/support/cases/${caseUid}`;
  const detailFields = "?fields=*,CaseHistories.*,FromPerson.Uid,FromPerson.Email";

  const reopen = await request("PUT", casePath, { Status: 1 });
  // Findings 2026-10-26: AgentName is required (500 with an empty body without it) and is shown
  // as free text; Type defaults to 6 (AgentReply). The response body is empty on success.
  const reply = await request("POST", `${casePath}/replies`, {
    Comment: "<p>Test reply sent from the Raycast extension API probe.</p>",
    AgentName: process.env.OUTSETA_AGENT_NAME ?? "Raycast test",
  });
  const after = await request("GET", casePath + detailFields);

  writeFileSync("fixtures/raw/reply-test.json", JSON.stringify({ reopen, reply, after }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
