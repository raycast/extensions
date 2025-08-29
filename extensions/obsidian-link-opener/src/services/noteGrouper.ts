import { NoteWithUrl, GroupedNote } from "../types";
import { UsageTracker } from "./usageTracker";
import { getPreferences } from "../utils/preferences";

export class NoteGrouper {
  private usageTracker: UsageTracker;
  private useFrecency: boolean;

  constructor() {
    this.usageTracker = new UsageTracker();
    const preferences = getPreferences();
    this.useFrecency = preferences.useFrecency ?? true;
  }

  /**
   * Groups notes by their file path and aggregates all URLs from the same note.
   * Applies frecency scoring based on usage patterns.
   */
  async groupAndSortNotes(notes: NoteWithUrl[]): Promise<GroupedNote[]> {
    // Group notes by their path (same note with multiple URLs)
    const noteMap = new Map<string, GroupedNote>();

    for (const note of notes) {
      const existingNote = noteMap.get(note.path);

      if (existingNote) {
        // Add URL to existing note
        existingNote.urls.push({
          url: note.url,
          source: note.urlSource,
        });
      } else {
        // Create new grouped note
        noteMap.set(note.path, {
          id: note.path, // Use path as unique identifier
          title: note.title,
          path: note.path,
          vault: note.vault,
          frontmatter: note.frontmatter,
          lastModified: note.lastModified,
          urls: [
            {
              url: note.url,
              source: note.urlSource,
            },
          ],
        });
      }
    }

    // Convert to array and apply frecency scoring
    const groupedNotes = Array.from(noteMap.values());

    // Sort URLs within each note: homepage first, then alphabetical
    for (const note of groupedNotes) {
      note.urls.sort((a, b) => {
        // Homepage always comes first
        if (a.source === "homepage") return -1;
        if (b.source === "homepage") return 1;

        // Then sort alphabetically by source
        return a.source.localeCompare(b.source);
      });
    }

    if (this.useFrecency) {
      // Calculate frecency scores for each note
      for (const note of groupedNotes) {
        const usage = await this.usageTracker.getUsageData(note.id);
        note.frecencyScore = this.usageTracker.calculateFrecencyScore(usage);
        note.frecencyBucket = this.usageTracker.getFrecencyBucket(
          note.frecencyScore
        );
      }

      // Sort by frecency bucket first, then alphabetically within each bucket
      groupedNotes.sort((a, b) => {
        // Higher frecency buckets come first
        if (a.frecencyBucket !== b.frecencyBucket) {
          return (b.frecencyBucket || 0) - (a.frecencyBucket || 0);
        }

        // Within the same bucket, sort alphabetically
        return a.title.localeCompare(b.title, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
    } else {
      // Simple alphabetical sorting
      groupedNotes.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );
    }

    // Clean up old usage data
    const currentNoteIds = new Set(groupedNotes.map((note) => note.id));
    await this.usageTracker.cleanup(currentNoteIds);

    return groupedNotes;
  }

  /**
   * Records that a note was accessed by the user
   */
  async recordNoteUsage(noteId: string): Promise<void> {
    await this.usageTracker.recordUsage(noteId);
  }

  /**
   * Filters grouped notes by URL source (for specific commands)
   */
  filterByUrlSource(notes: GroupedNote[], urlSource: string): GroupedNote[] {
    return notes
      .map((note) => ({
        ...note,
        urls: note.urls.filter(
          (url: { url: string; source: string }) => url.source === urlSource
        ),
      }))
      .filter((note) => note.urls.length > 0);
  }

  /**
   * Converts grouped notes back to individual NoteWithUrl items for display
   * This is useful when you want to show individual URLs rather than grouped notes
   */
  expandToIndividualUrls(groupedNotes: GroupedNote[]): NoteWithUrl[] {
    const expandedNotes: NoteWithUrl[] = [];

    for (const groupedNote of groupedNotes) {
      for (const urlInfo of groupedNote.urls) {
        expandedNotes.push({
          id: `${groupedNote.id}-${urlInfo.source}`,
          title: groupedNote.title,
          path: groupedNote.path,
          vault: groupedNote.vault,
          frontmatter: groupedNote.frontmatter,
          lastModified: groupedNote.lastModified,
          url: urlInfo.url,
          urlSource: urlInfo.source,
        });
      }
    }

    return expandedNotes;
  }
}
