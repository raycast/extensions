import { test } from "node:test";
import * as assert from "node:assert";
import { WiiMAPIError, type ErrorCode } from "./errors";

test("WiiMAPIError - all error codes have hints", () => {
  const errorCodes: ErrorCode[] = [
    "DISCOVERY_FAILED",
    "NETWORK_TIMEOUT",
    "INVALID_RESPONSE",
    "DEVICE_NOT_FOUND",
    "INVALID_DEVICE_IP",
    "COMMAND_FAILED",
    "CERTIFICATE_ERROR",
    "UNKNOWN_ERROR",
  ];

  errorCodes.forEach((code) => {
    const error = new WiiMAPIError(code, "Test message");
    const hint = error.getHint();

    assert.ok(hint, `No hint found for error code: ${code}`);
    assert.ok(hint.title, `No title for error code: ${code}`);
    assert.ok(hint.message, `No message for error code: ${code}`);
  });
});

test("WiiMAPIError - DISCOVERY_FAILED has correct hint", () => {
  const error = new WiiMAPIError("DISCOVERY_FAILED", "Device discovery failed");
  const hint = error.getHint();

  assert.strictEqual(hint.title, "Device Discovery Failed");
  assert.strictEqual(hint.message, "Could not find WiiM device on your network.");
  assert.ok(Array.isArray(hint.recoverySteps));
  assert.strictEqual(hint.recoverySteps?.length, 2);
});

test("WiiMAPIError - NETWORK_TIMEOUT has correct hint", () => {
  const error = new WiiMAPIError("NETWORK_TIMEOUT", "Network timeout");
  const hint = error.getHint();

  assert.strictEqual(hint.title, "Network Timeout");
  assert.strictEqual(hint.message, "Device did not respond within 5 seconds.");
  assert.ok(Array.isArray(hint.recoverySteps));
  assert.strictEqual(hint.recoverySteps?.length, 3);
});

test("WiiMAPIError - INVALID_RESPONSE has correct hint", () => {
  const error = new WiiMAPIError("INVALID_RESPONSE", "Invalid response");
  const hint = error.getHint();

  assert.strictEqual(hint.title, "Invalid Response");
  assert.strictEqual(hint.message, "Device returned unexpected response format.");
  assert.ok(Array.isArray(hint.recoverySteps));
  assert.strictEqual(hint.recoverySteps?.length, 3);
});

test("WiiMAPIError - DEVICE_NOT_FOUND has correct hint", () => {
  const error = new WiiMAPIError("DEVICE_NOT_FOUND", "Device not found");
  const hint = error.getHint();

  assert.strictEqual(hint.title, "Device Not Found");
  assert.strictEqual(hint.message, "WiiM device IP address is not configured.");
  assert.ok(Array.isArray(hint.recoverySteps));
  assert.strictEqual(hint.recoverySteps?.length, 2);
});

test("WiiMAPIError - INVALID_DEVICE_IP has correct hint", () => {
  const error = new WiiMAPIError("INVALID_DEVICE_IP", "Invalid IP");
  const hint = error.getHint();

  assert.strictEqual(hint.title, "Invalid Device IP");
  assert.strictEqual(hint.message, "The IP address configured in settings is invalid.");
  assert.ok(Array.isArray(hint.recoverySteps));
  assert.strictEqual(hint.recoverySteps?.length, 3);
});

test("WiiMAPIError - COMMAND_FAILED has correct hint", () => {
  const error = new WiiMAPIError("COMMAND_FAILED", "Command failed");
  const hint = error.getHint();

  assert.strictEqual(hint.title, "Command Failed");
  assert.strictEqual(hint.message, "Device rejected the command.");
  assert.ok(Array.isArray(hint.recoverySteps));
  assert.strictEqual(hint.recoverySteps?.length, 2);
});

test("WiiMAPIError - CERTIFICATE_ERROR has correct hint", () => {
  const error = new WiiMAPIError("CERTIFICATE_ERROR", "Certificate error");
  const hint = error.getHint();

  assert.strictEqual(hint.title, "Certificate Error");
  assert.strictEqual(hint.message, "Could not establish secure connection to device.");
  assert.ok(Array.isArray(hint.recoverySteps));
  assert.strictEqual(hint.recoverySteps?.length, 2);
});

test("WiiMAPIError - UNKNOWN_ERROR has correct hint", () => {
  const error = new WiiMAPIError("UNKNOWN_ERROR", "Unknown error");
  const hint = error.getHint();

  assert.strictEqual(hint.title, "Unknown Error");
  assert.strictEqual(hint.message, "An unexpected error occurred.");
  assert.ok(Array.isArray(hint.recoverySteps));
  assert.strictEqual(hint.recoverySteps?.length, 3);
});

test("WiiMAPIError - constructor stores all properties", () => {
  const originalError = new Error("Original error");
  const error = new WiiMAPIError("NETWORK_TIMEOUT", "Timeout occurred", 500, originalError);

  assert.strictEqual(error.code, "NETWORK_TIMEOUT");
  assert.strictEqual(error.message, "Timeout occurred");
  assert.strictEqual(error.statusCode, 500);
  assert.strictEqual(error.originalError, originalError);
  assert.strictEqual(error.name, "WiiMAPIError");
});

test("WiiMAPIError - extends Error class", () => {
  const error = new WiiMAPIError("UNKNOWN_ERROR", "Test error");
  assert.ok(error instanceof Error);
  assert.strictEqual(error.name, "WiiMAPIError");
});
