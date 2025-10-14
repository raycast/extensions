import {
  claudeCodeCommands,
  getCommandsByCategory,
  searchCommands,
} from "../constants/commands-data";

describe("commands-data", () => {
  describe("claudeCodeCommands", () => {
    it("should contain all expected categories", () => {
      const categories = [
        ...new Set(claudeCodeCommands.map((cmd) => cmd.category)),
      ];
      expect(categories).toContain("Commands");
      expect(categories).toContain("Keyboard Shortcuts");
      expect(categories).toContain("Multiline Input");
      expect(categories).toContain("Quick Prefixes");
      expect(categories).toContain("CLI Flags");
      expect(categories).toContain("Special Keywords");
      expect(categories).toContain("Configuration Commands");
      expect(categories).toContain("File Operations");
    });

    it("should have required properties for each command", () => {
      claudeCodeCommands.forEach((command) => {
        expect(command).toHaveProperty("id");
        expect(command).toHaveProperty("name");
        expect(command).toHaveProperty("description");
        expect(command).toHaveProperty("category");
        expect(typeof command.id).toBe("string");
        expect(typeof command.name).toBe("string");
        expect(typeof command.description).toBe("string");
        expect(typeof command.category).toBe("string");
      });
    });

    it("should have unique IDs for all commands", () => {
      const ids = claudeCodeCommands.map((cmd) => cmd.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should contain at least 26 commands", () => {
      const commands = claudeCodeCommands.filter(
        (cmd) => cmd.category === "Commands",
      );
      expect(commands.length).toBeGreaterThanOrEqual(26);
    });

    it("should include key commands", () => {
      const commandNames = claudeCodeCommands
        .filter((cmd) => cmd.category === "Commands")
        .map((cmd) => cmd.name);

      expect(commandNames).toContain("/help");
      expect(commandNames).toContain("/clear");
      expect(commandNames).toContain("/config");
      expect(commandNames).toContain("/status");
      expect(commandNames).toContain("/model");
      expect(commandNames).toContain("/pr-comments");
      expect(commandNames).toContain("/vim");
    });

    it("should include key keyboard shortcuts", () => {
      const shortcuts = claudeCodeCommands
        .filter((cmd) => cmd.category === "Keyboard Shortcuts")
        .map((cmd) => cmd.name);

      expect(shortcuts).toContain("Ctrl+C");
      expect(shortcuts).toContain("Ctrl+D");
      expect(shortcuts).toContain("Ctrl+V");
      expect(shortcuts).toContain("Esc + Esc");
    });

    it("should include special keywords", () => {
      const specialKeywords = claudeCodeCommands
        .filter((cmd) => cmd.category === "Special Keywords")
        .map((cmd) => cmd.name);

      expect(specialKeywords).toContain("ultrathink");
      expect(specialKeywords).toContain("megathink");
      expect(specialKeywords).toContain("think");
    });
  });

  describe("getCommandsByCategory", () => {
    it("should group commands by category", () => {
      const grouped = getCommandsByCategory();

      expect(Array.isArray(grouped)).toBe(true);
      expect(grouped.length).toBeGreaterThan(0);

      grouped.forEach((group) => {
        expect(group).toHaveProperty("category");
        expect(group).toHaveProperty("commands");
        expect(Array.isArray(group.commands)).toBe(true);
        expect(group.commands.length).toBeGreaterThan(0);
      });
    });

    it("should include all commands in grouped result", () => {
      const grouped = getCommandsByCategory();
      const totalCommands = grouped.reduce(
        (sum, group) => sum + group.commands.length,
        0,
      );
      expect(totalCommands).toBe(claudeCodeCommands.length);
    });

    it("should have consistent categories", () => {
      const grouped = getCommandsByCategory();
      grouped.forEach((group) => {
        group.commands.forEach((command) => {
          expect(command.category).toBe(group.category);
        });
      });
    });
  });

  describe("searchCommands", () => {
    it("should search by command name", () => {
      const results = searchCommands("clear");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((cmd) => cmd.name === "/clear")).toBe(true);
    });

    it("should search by description", () => {
      const results = searchCommands("token");
      expect(results.length).toBeGreaterThan(0);
      const hasTokenInDescription = results.every((cmd) =>
        cmd.description.toLowerCase().includes("token"),
      );
      expect(hasTokenInDescription).toBe(true);
    });

    it("should search by category", () => {
      const results = searchCommands("keyboard");
      expect(results.length).toBeGreaterThan(0);
      const keyboardShortcuts = results.filter(
        (cmd) => cmd.category === "Keyboard Shortcuts",
      );
      expect(keyboardShortcuts.length).toBeGreaterThan(0);
    });

    it("should be case insensitive", () => {
      const resultsLower = searchCommands("clear");
      const resultsUpper = searchCommands("CLEAR");
      const resultsMixed = searchCommands("CleAr");

      expect(resultsLower.length).toBe(resultsUpper.length);
      expect(resultsLower.length).toBe(resultsMixed.length);
    });

    it("should return empty array for no matches", () => {
      const results = searchCommands("xyznonexistentcommand123");
      expect(results).toEqual([]);
    });

    it("should find special characters in commands", () => {
      const ctrlResults = searchCommands("ctrl+");
      expect(ctrlResults.length).toBeGreaterThan(0);

      const slashResults = searchCommands("/");
      expect(slashResults.length).toBeGreaterThan(0);
    });
  });
});
