#!/usr/bin/env node
import { createInterface } from "node:readline";
const send = (value) => process.stdout.write(JSON.stringify(value) + "\n");
const targets = [];
let lastSearch; let prewarms = 0; let pages = false; let repeatPage = false; let wrongKindFirst = false;
send({ event: "ready" });
createInterface({ input: process.stdin }).on("line", (line) => {
  const request = JSON.parse(line);
  if (request.op === "cancel_render") { targets.push(request.target); return; }
  if (request.op === "cancelled-renders") return send({ id: request.id, targets });
  if (request.op === "hang") return;
  if (request.op === "invalid") return process.stdout.write("not json\n");
  if (request.op === "exit") return process.exit(1);
  if (request.op === "error") return send({ id: request.id, error: "Test backend error" });
  if (request.op === "prewarm") prewarms++;
  if (request.op === "test-pages") { pages = true; repeatPage = Boolean(request.repeat); wrongKindFirst = Boolean(request.wrongKindFirst); return send({id:request.id,ok:true}); }
  if (request.op === "prewarm-count") return send({ id: request.id, prewarms });
  if (request.op === "files") {
    lastSearch = request;
    const offset = request.after && !repeatPage ? 200 : 0;
    const hits = pages ? Array.from({length:offset ? 1 : 200},(_,i)=>({path:`/a folder/${offset+i}.txt`,kind:wrongKindFirst&&!offset?'image':'doc',segment:'name',segment_id:offset+i,modified:1000-offset-i,size:1,info:{}})) : [];
    return send({ id: request.id, hits, strong:hits.length, meaning:false });
  }
  if (request.op === "search") { lastSearch = request; return send({ id: request.id, hits: [], strong: 0, meaning: true }); }
  if (request.op === "last-search") return send({ id: request.id, request: lastSearch });
  setTimeout(() => send({ id: request.id, ok: true, value: request.value }), request.delay ?? 0);
});
