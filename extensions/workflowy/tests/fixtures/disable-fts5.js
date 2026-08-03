const { DatabaseSync } = require("node:sqlite");

const originalExec = DatabaseSync.prototype.exec;

DatabaseSync.prototype.exec = function execWithoutFts5(sql) {
  if (/\bUSING\s+fts5\b/i.test(String(sql))) {
    throw new Error("no such module: fts5");
  }

  return originalExec.call(this, sql);
};
