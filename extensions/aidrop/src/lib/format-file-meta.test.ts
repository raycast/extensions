import test from "node:test";
import assert from "node:assert/strict";

import { formatFileSize, formatRelativeTime } from "./format-file-meta";

test("formatFileSize returns bytes for values under 1 KB", () => {
  assert.equal(formatFileSize(0), "0 B");
  assert.equal(formatFileSize(1), "1 B");
  assert.equal(formatFileSize(1023), "1023 B");
});

test("formatFileSize returns KB for values 1 KB to under 1 MB", () => {
  assert.equal(formatFileSize(1024), "1.0 KB");
  assert.equal(formatFileSize(1536), "1.5 KB");
  assert.equal(formatFileSize(1024 * 1024 - 1), "1024.0 KB");
});

test("formatFileSize returns MB for values 1 MB to under 1 GB", () => {
  assert.equal(formatFileSize(1024 * 1024), "1.0 MB");
  assert.equal(formatFileSize(2500000), "2.4 MB");
  assert.equal(formatFileSize(1024 * 1024 * 1024 - 1), "1024.0 MB");
});

test("formatFileSize returns GB for values 1 GB and above", () => {
  assert.equal(formatFileSize(1024 * 1024 * 1024), "1.0 GB");
  assert.equal(formatFileSize(2 * 1024 * 1024 * 1024), "2.0 GB");
});

test("formatRelativeTime returns '방금 전' for less than 60 seconds ago", () => {
  const now = Date.now();
  assert.equal(formatRelativeTime(now, now), "방금 전");
  assert.equal(formatRelativeTime(now - 30_000, now), "방금 전");
  assert.equal(formatRelativeTime(now - 59_000, now), "방금 전");
});

test("formatRelativeTime returns minutes for 1–59 minutes ago", () => {
  const now = Date.now();
  assert.equal(formatRelativeTime(now - 60_000, now), "1분 전");
  assert.equal(formatRelativeTime(now - 5 * 60_000, now), "5분 전");
  assert.equal(formatRelativeTime(now - 59 * 60_000, now), "59분 전");
});

test("formatRelativeTime returns hours for 1–23 hours ago", () => {
  const now = Date.now();
  assert.equal(formatRelativeTime(now - 60 * 60_000, now), "1시간 전");
  assert.equal(formatRelativeTime(now - 2 * 60 * 60_000, now), "2시간 전");
  assert.equal(formatRelativeTime(now - 23 * 60 * 60_000, now), "23시간 전");
});

test("formatRelativeTime returns days for 1–6 days ago", () => {
  const now = Date.now();
  assert.equal(formatRelativeTime(now - 24 * 60 * 60_000, now), "1일 전");
  assert.equal(formatRelativeTime(now - 3 * 24 * 60 * 60_000, now), "3일 전");
  assert.equal(formatRelativeTime(now - 6 * 24 * 60 * 60_000, now), "6일 전");
});

test("formatRelativeTime returns weeks for 7+ days ago", () => {
  const now = Date.now();
  assert.equal(formatRelativeTime(now - 7 * 24 * 60 * 60_000, now), "1주 전");
  assert.equal(formatRelativeTime(now - 14 * 24 * 60 * 60_000, now), "2주 전");
});
