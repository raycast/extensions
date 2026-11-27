import test from "node:test";
import assert from "node:assert/strict";
import { validate, sshArgs, shellQuote, sshCommand } from "../src/model.ts";

const base = {
  id: "1",
  name: "Server",
  host: "server",
  user: "",
  port: "",
  identityFile: "",
  notes: "",
  favorite: false,
};
test("validates required fields and rejects option and control injection", () => {
  assert.deepEqual(validate(base), {});
  assert.ok(
    validate({
      ...base,
      name: " ",
      host: "-oProxyCommand=bad",
      user: "bad\nuser",
      port: "65536",
      identityFile: "key\nfile",
    }).host,
  );
  const errors = validate({
    ...base,
    name: " ",
    host: "-bad",
    user: "bad\nuser",
    port: "65536",
    identityFile: "key\nfile",
  });
  assert.deepEqual(Object.keys(errors).sort(), [
    "host",
    "identityFile",
    "name",
    "port",
    "user",
  ]);
  assert.ok(validate({ ...base, port: "22x" }).port);
});
test("SSH arguments preserve config defaults and handle paths safely", () => {
  assert.deepEqual(sshArgs(base), ["server"]);
  const item = {
    ...base,
    user: "root",
    port: "2222",
    identityFile: "~/key's file",
  };
  assert.deepEqual(sshArgs(item), [
    "-p",
    "2222",
    "-i",
    `${process.env.HOME}/key's file`,
    "-l",
    "root",
    "server",
  ]);
  assert.equal(shellQuote("a'b"), "'a'\\''b'");
  assert.ok(sshCommand(item).includes("'\\''"));
});
