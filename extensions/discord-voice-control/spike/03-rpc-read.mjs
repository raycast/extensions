#!/usr/bin/env node
// Phase 1 spike: DISCORD LOCAL RPC over IPC  (READ-ONLY confirmation probe)
//
// Goal: with YOUR registered Discord app, find out whether we can READ mute/deafen state
// (GET_VOICE_SETTINGS) as a confirmation source. This is for PRIVATE/personal use, so the
// "Discord must approve your app for strangers" wall does not apply to your own account.
//
// It walks the real RPC auth ladder and reports exactly which rung works / fails:
//   1. socket discovery + connect
//   2. HANDSHAKE (needs client_id)
//   3. on READY: try GET_VOICE_SETTINGS directly (works if already authed)
//   4. if that errors: run AUTHORIZE (Discord shows you an approve popup) to get a `code`
//   5. exchange code -> access_token  (needs client_secret; OPTIONAL, only if you set it)
//   6. AUTHENTICATE with token, then GET_VOICE_SETTINGS again
//
// It NEVER sends SET_VOICE_SETTINGS, uses no user token, no selfbot behavior.
//
// Setup (you do this once):
//   1. https://discord.com/developers/applications -> New Application
//   2. Copy the Application ID (this is your CLIENT_ID — public, safe to commit for personal use)
//   3. (only if step 5 is needed) OAuth2 -> copy Client Secret, and add Redirect:
//        http://localhost   (any valid redirect; we use the RPC code flow, redirect is nominal)
//
// Usage:
//   DISCORD_CLIENT_ID=xxxx node 03-rpc-read.mjs
//   DISCORD_CLIENT_ID=xxxx DISCORD_CLIENT_SECRET=yyyy node 03-rpc-read.mjs   # enables token exchange

import net from "node:net";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const CLIENT_ID = process.env.DISCORD_CLIENT_ID || "0";
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || "";
const SCOPES = ["rpc", "rpc.voice.read"];
const OP = { HANDSHAKE: 0, FRAME: 1, CLOSE: 2, PING: 3, PONG: 4 };

function emit(step, status, detail) {
  console.log(`[RESULT] mechanism=rpc-ipc step=${step} status=${status} detail="${detail}"`);
}

function candidateSocketPaths() {
  const bases = [process.env.TMPDIR, process.env.XDG_RUNTIME_DIR, "/tmp", os.tmpdir()].filter(Boolean);
  const paths = [];
  for (const base of bases)
    for (let i = 0; i < 10; i++) paths.push(path.join(base.replace(/\/$/, ""), `discord-ipc-${i}`));
  return [...new Set(paths)];
}

function findSocket() {
  for (const p of candidateSocketPaths()) {
    try { if (fs.statSync(p).isSocket()) return p; } catch { /* absent */ }
  }
  return null;
}

function encode(op, payloadObj) {
  const json = Buffer.from(JSON.stringify(payloadObj), "utf8");
  const header = Buffer.alloc(8);
  header.writeInt32LE(op, 0);
  header.writeInt32LE(json.length, 4);
  return Buffer.concat([header, json]);
}

function decodeFrames(buf) {
  const frames = [];
  let offset = 0;
  while (buf.length - offset >= 8) {
    const op = buf.readInt32LE(offset);
    const len = buf.readInt32LE(offset + 4);
    if (buf.length - offset - 8 < len) break;
    const body = buf.slice(offset + 8, offset + 8 + len).toString("utf8");
    let data; try { data = JSON.parse(body); } catch { data = { raw: body }; }
    frames.push({ op, data });
    offset += 8 + len;
  }
  return { frames, rest: buf.slice(offset) };
}

async function exchangeCodeForToken(code) {
  // Standard OAuth2 token endpoint. Requires client_secret.
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: "http://localhost",
  });
  const res = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`token exchange ${res.status}: ${JSON.stringify(json)}`);
  return json.access_token;
}

async function main() {
  if (CLIENT_ID === "0") {
    emit("config", "FAIL", "No DISCORD_CLIENT_ID set. Register an app, then: DISCORD_CLIENT_ID=xxxx node 03-rpc-read.mjs");
    process.exit(0);
  }

  const sock = findSocket();
  if (!sock) {
    emit("socket-discovery", "FAIL", "No discord-ipc-N socket found. Is the Discord DESKTOP app running?");
    process.exit(0);
  }
  emit("socket-discovery", "PASS", `Found IPC socket at ${sock}`);

  const client = net.createConnection(sock);
  let acc = Buffer.alloc(0);
  let settled = false;
  let triedAuthorize = false;

  const done = (code) => { if (settled) return; settled = true; try { client.destroy(); } catch {} process.exit(code); };
  const send = (op, payload) => client.write(encode(op, payload));
  const getVoice = () => send(OP.FRAME, { cmd: "GET_VOICE_SETTINGS", nonce: "spike-get-voice" });

  const timer = setTimeout(() => {
    emit("response", "UNKNOWN", "No conclusive response within 8s (a Discord approve popup may be waiting — check Discord).");
    done(0);
  }, 8000);
  const bump = () => { timer.refresh?.(); };

  client.on("connect", () => {
    emit("socket-connect", "PASS", "Connected; sending HANDSHAKE.");
    send(OP.HANDSHAKE, { v: 1, client_id: CLIENT_ID });
  });

  client.on("data", async (chunk) => {
    acc = Buffer.concat([acc, chunk]);
    const { frames, rest } = decodeFrames(acc);
    acc = rest;
    for (const f of frames) {
      bump();

      if (f.op === OP.CLOSE) {
        clearTimeout(timer);
        emit("handshake-response", "FAIL", `Discord closed connection: ${JSON.stringify(f.data)} (check CLIENT_ID is the Application ID).`);
        return done(0);
      }

      if (f.op === OP.FRAME && f.data?.evt === "READY") {
        const user = f.data?.data?.user?.username ?? "unknown";
        emit("handshake-response", "PASS", `RPC READY as '${user}'. Trying GET_VOICE_SETTINGS directly...`);
        getVoice();
        continue;
      }

      if (f.op === OP.FRAME && f.data?.cmd === "GET_VOICE_SETTINGS") {
        if (f.data?.evt === "ERROR") {
          const err = JSON.stringify(f.data?.data);
          if (!triedAuthorize) {
            emit("get-voice-direct", "UNKNOWN", `Not yet authorized (${err}). Starting AUTHORIZE flow — APPROVE THE POPUP IN DISCORD.`);
            triedAuthorize = true;
            send(OP.FRAME, { cmd: "AUTHORIZE", nonce: "spike-authorize", args: { client_id: CLIENT_ID, scopes: SCOPES } });
            continue;
          }
          clearTimeout(timer);
          emit("get-voice-settings", "FAIL", `GET_VOICE_SETTINGS rejected after auth: ${err}. Confirm 'rpc.voice.read' scope is allowed for your app.`);
          return done(0);
        }
        clearTimeout(timer);
        const d = f.data?.data ?? {};
        emit("get-voice-settings", "PASS",
          `READ mute=${d.mute} deaf=${d.deaf} -> CONFIRMATION WORKS for your account. Can upgrade best-effort -> verified.`);
        return done(0);
      }

      if (f.op === OP.FRAME && f.data?.cmd === "AUTHORIZE") {
        if (f.data?.evt === "ERROR") {
          clearTimeout(timer);
          emit("authorize", "FAIL", `AUTHORIZE rejected: ${JSON.stringify(f.data?.data)} (your app may not be allowed these scopes).`);
          return done(0);
        }
        const code = f.data?.data?.code;
        emit("authorize", "PASS", `Got authorization code. ${CLIENT_SECRET ? "Exchanging for token..." : "No CLIENT_SECRET set -> cannot exchange. Re-run with DISCORD_CLIENT_SECRET=yyyy to finish the read test."}`);
        if (!CLIENT_SECRET) { clearTimeout(timer); return done(0); }
        try {
          const token = await exchangeCodeForToken(code);
          emit("token-exchange", "PASS", "Got access_token. Sending AUTHENTICATE...");
          send(OP.FRAME, { cmd: "AUTHENTICATE", nonce: "spike-authenticate", args: { access_token: token } });
        } catch (e) {
          clearTimeout(timer);
          emit("token-exchange", "FAIL", String(e.message));
          return done(0);
        }
        continue;
      }

      if (f.op === OP.FRAME && f.data?.cmd === "AUTHENTICATE") {
        if (f.data?.evt === "ERROR") {
          clearTimeout(timer);
          emit("authenticate", "FAIL", `AUTHENTICATE rejected: ${JSON.stringify(f.data?.data)}`);
          return done(0);
        }
        emit("authenticate", "PASS", "Authenticated. Retrying GET_VOICE_SETTINGS...");
        getVoice();
        continue;
      }

      if (f.op === OP.FRAME) console.log("    (frame) " + JSON.stringify(f.data).slice(0, 240));
    }
  });

  client.on("error", (err) => { clearTimeout(timer); emit("socket-connect", "FAIL", `Socket error: ${err.message}`); done(0); });
  client.on("close", () => done(0));
}

main();
