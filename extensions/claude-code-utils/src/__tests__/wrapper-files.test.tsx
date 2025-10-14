/**
 * Tests for wrapper files in src/ root that re-export from nested command folders
 */

import * as browseAgents from "../browse-agents";
import * as browseCommands from "../browse-commands";
import * as browseSnippets from "../browse-snippets";
import * as cheatsheet from "../cheatsheet";
import * as createSnippet from "../create-snippet";
import * as receivedMessages from "../received-messages";
import * as sentMessages from "../sent-messages";

describe("Wrapper Files", () => {
  it("should export browse-agents from nested location", () => {
    expect(browseAgents.default).toBeDefined();
  });

  it("should export browse-commands from nested location", () => {
    expect(browseCommands.default).toBeDefined();
  });

  it("should export browse-snippets from nested location", () => {
    expect(browseSnippets.default).toBeDefined();
  });

  it("should export cheatsheet from nested location", () => {
    expect(cheatsheet.default).toBeDefined();
  });

  it("should export create-snippet from nested location", () => {
    expect(createSnippet.default).toBeDefined();
  });

  it("should export received-messages from nested location", () => {
    expect(receivedMessages.default).toBeDefined();
  });

  it("should export sent-messages from nested location", () => {
    expect(sentMessages.default).toBeDefined();
  });
});
