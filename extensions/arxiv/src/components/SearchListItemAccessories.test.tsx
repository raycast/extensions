import { buildAccessories } from "./SearchListItemAccessories";
import { Color } from "@raycast/api";

describe("SearchListItemAccessories", () => {
  describe("buildAccessories", () => {
    describe("timeAgo display mode", () => {
      it("should return time ago tag when accessoryDisplay is timeAgo", () => {
        const accessories = buildAccessories({
          accessoryDisplay: "timeAgo",
          timeAgo: "2 days ago",
          journalRef: "Nature 2023",
          comment: "10 pages",
        });

        expect(accessories).toEqual([{ tag: "2 days ago" }]);
      });

      it("should ignore other fields when in timeAgo mode", () => {
        const accessories = buildAccessories({
          accessoryDisplay: "timeAgo",
          timeAgo: "1 week ago",
          journalRef: "Science 2023",
          comment: "Accepted at ICML 2023, 15 pages",
        });

        expect(accessories).toEqual([{ tag: "1 week ago" }]);
      });
    });

    describe("publicationInfo display mode", () => {
      it("should extract venue from journal reference", () => {
        const accessories = buildAccessories({
          accessoryDisplay: "publicationInfo",
          timeAgo: "2 days ago",
          journalRef: "Nature Communications 12:345, 2023",
        });

        expect(accessories).toContainEqual({
          tag: { value: "Nature Communications", color: Color.Blue },
          tooltip: "Nature Communications 12:345, 2023",
        });
      });

      it("should extract venue from journal with parentheses", () => {
        const accessories = buildAccessories({
          accessoryDisplay: "publicationInfo",
          timeAgo: "2 days ago",
          journalRef: "Physical Review Letters (2023)",
        });

        expect(accessories).toContainEqual({
          tag: { value: "Physical Review Letters", color: Color.Blue },
          tooltip: "Physical Review Letters (2023)",
        });
      });

      it("should extract conference from comment when no journal", () => {
        const accessories = buildAccessories({
          accessoryDisplay: "publicationInfo",
          timeAgo: "2 days ago",
          comment: "Accepted at NeurIPS 2023",
        });

        expect(accessories).toContainEqual({
          tag: { value: "NeurIPS 2023", color: Color.Blue },
          tooltip: "Accepted at NeurIPS 2023",
        });
      });

      it("should extract conference with various formats", () => {
        const testCases = [
          { comment: "To appear in ICML 2023", expected: "ICML 2023" },
          { comment: "Accepted to CVPR 2024", expected: "CVPR 2024" },
          { comment: "Published at ICLR 2023", expected: "ICLR 2023" },
          { comment: "Presented at ACL 2023", expected: "ACL 2023" },
        ];

        testCases.forEach(({ comment, expected }) => {
          const accessories = buildAccessories({
            accessoryDisplay: "publicationInfo",
            timeAgo: "2 days ago",
            comment,
          });

          expect(accessories).toContainEqual({
            tag: { value: expected, color: Color.Blue },
            tooltip: comment,
          });
        });
      });

      it("should prefer journal over conference", () => {
        const accessories = buildAccessories({
          accessoryDisplay: "publicationInfo",
          timeAgo: "2 days ago",
          journalRef: "Science 2023",
          comment: "Also presented at ICML 2023",
        });

        expect(accessories).toContainEqual({
          tag: { value: "Science", color: Color.Blue },
          tooltip: "Science 2023",
        });
        expect(accessories).not.toContainEqual(
          expect.objectContaining({ tag: { value: "ICML 2023", color: Color.Blue } })
        );
      });

      it("should extract page count from comment", () => {
        const accessories = buildAccessories({
          accessoryDisplay: "publicationInfo",
          timeAgo: "2 days ago",
          comment: "15 pages, 5 figures",
        });

        expect(accessories).toContainEqual({
          text: "15 pages",
          tooltip: "15 pages, 5 figures",
        });
      });

      it("should handle various page count formats", () => {
        const testCases = [
          { comment: "10 pages", expected: "10 pages" },
          { comment: "1 page", expected: "1 pages" }, // Note: regex doesn't distinguish
          { comment: "Paper is 25 pages long", expected: "25 pages" },
          { comment: "Total: 100 Pages", expected: "100 pages" },
        ];

        testCases.forEach(({ comment, expected }) => {
          const accessories = buildAccessories({
            accessoryDisplay: "publicationInfo",
            timeAgo: "2 days ago",
            comment,
          });

          expect(accessories).toContainEqual({
            text: expected,
            tooltip: comment,
          });
        });
      });

      it("should ignore page counts outside valid range", () => {
        const tooFew = buildAccessories({
          accessoryDisplay: "publicationInfo",
          timeAgo: "2 days ago",
          comment: "0 pages",
        });
        expect(tooFew).not.toContainEqual(expect.objectContaining({ text: "0 pages" }));

        const tooMany = buildAccessories({
          accessoryDisplay: "publicationInfo",
          timeAgo: "2 days ago",
          comment: "10000 pages",
        });
        expect(tooMany).not.toContainEqual(expect.objectContaining({ text: "10000 pages" }));
      });

      it("should skip venues that are too long", () => {
        const longVenue = "A".repeat(51); // Assuming MAX_VENUE_NAME_LENGTH is 50
        const accessories = buildAccessories({
          accessoryDisplay: "publicationInfo",
          timeAgo: "2 days ago",
          journalRef: `${longVenue} 2023`,
        });

        expect(accessories).not.toContainEqual(
          expect.objectContaining({ tag: expect.objectContaining({ value: longVenue }) })
        );
      });

      it("should return empty array when no publication info available", () => {
        const accessories = buildAccessories({
          accessoryDisplay: "publicationInfo",
          timeAgo: "2 days ago",
        });

        expect(accessories).toEqual([]);
      });

      it("should handle both venue and page count", () => {
        const accessories = buildAccessories({
          accessoryDisplay: "publicationInfo",
          timeAgo: "2 days ago",
          journalRef: "Nature 2023",
          comment: "Extended version, 30 pages",
        });

        expect(accessories).toHaveLength(2);
        expect(accessories).toContainEqual({
          tag: { value: "Nature", color: Color.Blue },
          tooltip: "Nature 2023",
        });
        expect(accessories).toContainEqual({
          text: "30 pages",
          tooltip: "Extended version, 30 pages",
        });
      });
    });
  });
});
