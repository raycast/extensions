import assert from "node:assert/strict";
import test from "node:test";
import {
  busyCalScriptingDefinitionContainsCommand,
  classifyBusyCalCommandSupportError,
} from "../src/busycal-command-support";

test("classifyBusyCalCommandSupportError recognizes runtime unsupported open-item failures", () => {
  assert.equal(
    classifyBusyCalCommandSupportError(
      "BusyCal got an error: doesn’t understand the open item message.",
      "open item",
    ),
    true,
  );
});

test("classifyBusyCalCommandSupportError recognizes compile errors when the command is absent from sdef", () => {
  assert.equal(
    classifyBusyCalCommandSupportError(
      "Expected end of line but found identifier.",
      "open item",
      '<suite><command name="list calendars"/></suite>',
    ),
    true,
  );
});

test("classifyBusyCalCommandSupportError ignores compile errors when the command exists in sdef", () => {
  assert.equal(
    classifyBusyCalCommandSupportError(
      "Expected end of line but found identifier.",
      "open item",
      '<suite><command name="open item"/></suite>',
    ),
    false,
  );
});

test("busyCalScriptingDefinitionContainsCommand matches command and synonym names", () => {
  const scriptingDefinition =
    '<suite><command name="open item"/><synonym name="create natural language item"/></suite>';

  assert.equal(
    busyCalScriptingDefinitionContainsCommand(scriptingDefinition, "open item"),
    true,
  );
  assert.equal(
    busyCalScriptingDefinitionContainsCommand(
      scriptingDefinition,
      "create natural language item",
    ),
    true,
  );
});

test("classifyBusyCalCommandSupportError ignores unrelated AppleScript failures", () => {
  assert.equal(
    classifyBusyCalCommandSupportError(
      "Item was not found: abc123",
      "open item",
    ),
    false,
  );
  assert.equal(
    classifyBusyCalCommandSupportError(
      "BusyCal is still starting. Please try again in a moment.",
      "open item",
    ),
    false,
  );
});
