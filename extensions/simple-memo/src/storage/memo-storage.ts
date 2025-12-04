import { LocalStorage } from "@raycast/api";
import { nanoid } from "nanoid";
import { Memo } from "./types";

const STORAGE_KEY = "memos";

export class MemoStorage {
  static async getAllMemos(): Promise<Memo[]> {
    try {
      const storedMemos = await LocalStorage.getItem<string>(STORAGE_KEY);
      return storedMemos ? JSON.parse(storedMemos) : [];
    } catch (error) {
      console.error("Error loading memos:", error);
      throw new Error("Failed to load memos");
    }
  }

  static async createMemo(title: string, content: string): Promise<Memo> {
    try {
      const memos = await this.getAllMemos();

      const newMemo: Memo = {
        id: nanoid(),
        title,
        content,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedMemos = [...memos, newMemo];
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMemos));

      return newMemo;
    } catch (error) {
      console.error("Error creating memo:", error);
      throw new Error("Failed to create memo");
    }
  }

  static async updateMemo(id: string, updates: Partial<Memo>): Promise<Memo> {
    try {
      const memos = await this.getAllMemos();
      const memoIndex = memos.findIndex((memo) => memo.id === id);

      if (memoIndex === -1) {
        throw new Error("Memo not found");
      }

      const updatedMemo = {
        ...memos[memoIndex],
        ...updates,
        updatedAt: new Date(),
      };

      memos[memoIndex] = updatedMemo;
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(memos));

      return updatedMemo;
    } catch (error) {
      console.error("Error updating memo:", error);
      throw new Error("Failed to update memo");
    }
  }

  static async deleteMemo(id: string): Promise<void> {
    try {
      const memos = await this.getAllMemos();
      const updatedMemos = memos.filter((memo) => memo.id !== id);
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMemos));
    } catch (error) {
      console.error("Error deleting memo:", error);
      throw new Error("Failed to delete memo");
    }
  }

  static async deleteAllMemos(): Promise<void> {
    try {
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    } catch (error) {
      console.error("Error deleting all memos:", error);
      throw new Error("Failed to delete all memos");
    }
  }

  static async getMemoById(id: string): Promise<Memo | undefined> {
    try {
      const memos = await this.getAllMemos();
      return memos.find((memo) => memo.id === id);
    } catch (error) {
      console.error("Error finding memo:", error);
      throw new Error("Failed to find memo");
    }
  }
}
