import { fetchChangelog } from "../changelog";

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("changelog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchChangelog", () => {
    it("should fetch and parse changelog successfully", async () => {
      const mockChangelogMarkdown = `# Changelog

## [1.2.0]

- Added new feature A
- Fixed bug B
- Updated documentation

## 1.1.0

- Improved performance
- Added new feature C

## [1.0.0]

- Initial release
`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockChangelogMarkdown,
      } as Response);

      const versions = await fetchChangelog();

      expect(versions).toHaveLength(3);
      expect(versions[0]).toEqual({
        version: "1.2.0",
        changes: [
          "Added new feature A",
          "Fixed bug B",
          "Updated documentation",
        ],
      });
      expect(versions[1]).toEqual({
        version: "1.1.0",
        changes: ["Improved performance", "Added new feature C"],
      });
      expect(versions[2]).toEqual({
        version: "1.0.0",
        changes: ["Initial release"],
      });
    });

    it("should handle changelog with asterisk bullets", async () => {
      const mockChangelogMarkdown = `## 2.0.0

* Feature one
* Feature two
* Feature three
`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockChangelogMarkdown,
      } as Response);

      const versions = await fetchChangelog();

      expect(versions).toHaveLength(1);
      expect(versions[0].changes).toEqual([
        "Feature one",
        "Feature two",
        "Feature three",
      ]);
    });

    it("should handle mixed bullet styles", async () => {
      const mockChangelogMarkdown = `## 1.5.0

- Dash bullet
* Asterisk bullet
- Another dash
`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockChangelogMarkdown,
      } as Response);

      const versions = await fetchChangelog();

      expect(versions[0].changes).toEqual([
        "Dash bullet",
        "Asterisk bullet",
        "Another dash",
      ]);
    });

    it("should skip empty lines and non-bullet content", async () => {
      const mockChangelogMarkdown = `## 1.0.0

This is a description paragraph.

- Valid change 1

- Valid change 2

Some other text.

- Valid change 3
`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockChangelogMarkdown,
      } as Response);

      const versions = await fetchChangelog();

      expect(versions[0].changes).toEqual([
        "Valid change 1",
        "Valid change 2",
        "Valid change 3",
      ]);
    });

    it("should handle versions without brackets", async () => {
      const mockChangelogMarkdown = `## 2.0.0

- Change A

## [1.0.0]

- Change B
`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockChangelogMarkdown,
      } as Response);

      const versions = await fetchChangelog();

      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe("2.0.0");
      expect(versions[1].version).toBe("1.0.0");
    });

    it("should handle empty changelog", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => "",
      } as Response);

      const versions = await fetchChangelog();

      expect(versions).toEqual([]);
    });

    it("should handle changelog with no changes", async () => {
      const mockChangelogMarkdown = `## 1.0.0

`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockChangelogMarkdown,
      } as Response);

      const versions = await fetchChangelog();

      expect(versions).toHaveLength(1);
      expect(versions[0].changes).toEqual([]);
    });

    it("should throw error when fetch fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await expect(fetchChangelog()).rejects.toThrow(
        "Failed to fetch changelog: 404",
      );
    });

    it("should throw error when network error occurs", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchChangelog()).rejects.toThrow("Network error");
    });

    it("should handle complex version strings", async () => {
      const mockChangelogMarkdown = `## [1.2.3-beta.1]

- Beta feature

## [1.0.0-rc.2]

- Release candidate
`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockChangelogMarkdown,
      } as Response);

      const versions = await fetchChangelog();

      expect(versions[0].version).toBe("1.2.3-beta.1");
      expect(versions[1].version).toBe("1.0.0-rc.2");
    });

    it("should trim whitespace from changes", async () => {
      const mockChangelogMarkdown = `## 1.0.0

-   Change with extra spaces
-      Another with more spaces
`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockChangelogMarkdown,
      } as Response);

      const versions = await fetchChangelog();

      expect(versions[0].changes).toEqual([
        "Change with extra spaces",
        "Another with more spaces",
      ]);
    });

    it("should fetch from correct URL", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => "## 1.0.0\n- Test",
      } as Response);

      await fetchChangelog();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md",
      );
    });

    it("should handle multiple consecutive versions", async () => {
      const mockChangelogMarkdown = `## 3.0.0

- Feature 3

## 2.0.0

- Feature 2

## 1.0.0

- Feature 1
`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockChangelogMarkdown,
      } as Response);

      const versions = await fetchChangelog();

      expect(versions).toHaveLength(3);
      expect(versions.map((v) => v.version)).toEqual([
        "3.0.0",
        "2.0.0",
        "1.0.0",
      ]);
    });

    it("should ignore empty bullet items", async () => {
      const mockChangelogMarkdown = `## 1.0.0

- Valid change
-
-
- Another valid change
`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockChangelogMarkdown,
      } as Response);

      const versions = await fetchChangelog();

      expect(versions[0].changes).toEqual([
        "Valid change",
        "Another valid change",
      ]);
    });
  });
});
