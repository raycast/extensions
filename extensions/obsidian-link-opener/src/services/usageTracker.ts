import { LocalStorage } from "@raycast/api";

export interface UsageData {
  noteId: string; // File path relative to vault
  lastUsed: string; // ISO date string
  useCount: number;
}

export interface UsageStats {
  [noteId: string]: UsageData;
}

const USAGE_STORAGE_KEY = "obsidian-url-usage-stats";
const FRECENCY_HALF_LIFE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export class UsageTracker {
  private stats: UsageStats = {};
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;

    try {
      const stored = await LocalStorage.getItem<string>(USAGE_STORAGE_KEY);
      if (stored) {
        this.stats = JSON.parse(stored);
      }
      this.loaded = true;
    } catch (error) {
      console.error("Failed to load usage stats:", error);
      this.stats = {};
      this.loaded = true;
    }
  }

  async recordUsage(noteId: string): Promise<void> {
    await this.load();

    const existing = this.stats[noteId];
    const now = new Date().toISOString();

    this.stats[noteId] = {
      noteId,
      lastUsed: now,
      useCount: (existing?.useCount || 0) + 1,
    };

    await this.save();
  }

  async getUsageData(noteId: string): Promise<UsageData | null> {
    await this.load();
    return this.stats[noteId] || null;
  }

  calculateFrecencyScore(usage: UsageData | null): number {
    if (!usage) return 0;

    const now = Date.now();
    const lastUsedTime = new Date(usage.lastUsed).getTime();
    const timeSinceUse = now - lastUsedTime;

    // Exponential decay based on time since last use
    const recencyScore = Math.exp(-timeSinceUse / FRECENCY_HALF_LIFE);

    // Logarithmic growth for frequency (diminishing returns)
    const frequencyScore = Math.log2(usage.useCount + 1);

    // Combine both factors
    return recencyScore * frequencyScore;
  }

  // Group frecency scores into buckets for stable sorting
  getFrecencyBucket(score: number): number {
    if (score === 0) return 0; // Never used
    if (score < 0.1) return 1; // Rarely used
    if (score < 0.5) return 2; // Sometimes used
    if (score < 1.0) return 3; // Frequently used
    if (score < 2.0) return 4; // Very frequently used
    return 5; // Most frequently used
  }

  private async save(): Promise<void> {
    try {
      await LocalStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(this.stats));
    } catch (error) {
      console.error("Failed to save usage stats:", error);
    }
  }

  // Clean up old entries to prevent unbounded growth
  async cleanup(currentNoteIds: Set<string>): Promise<void> {
    await this.load();

    const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let changed = false;

    for (const noteId in this.stats) {
      const usage = this.stats[noteId];
      const lastUsedTime = new Date(usage.lastUsed).getTime();

      // Remove entries for deleted notes or very old unused entries
      if (!currentNoteIds.has(noteId) || lastUsedTime < oneMonthAgo) {
        delete this.stats[noteId];
        changed = true;
      }
    }

    if (changed) {
      await this.save();
    }
  }
}
