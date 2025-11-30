import { useEffect, useState, useCallback } from "react";
import { Prompt, CreatePromptInput, UpdatePromptInput } from "../types/prompt";
import {
  listPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
  updateLastUsed,
} from "../lib/promptStorage";

/**
 * プロンプト管理用のカスタムフック
 * CRUD 操作とローカル状態管理を提供
 */
export function usePrompts() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * プロンプト一覧を読み込む
   */
  const loadPrompts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listPrompts();
      setPrompts(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初回マウント時に読み込み
  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  /**
   * 新しいプロンプトを作成
   */
  const create = useCallback(
    async (input: CreatePromptInput): Promise<Prompt> => {
      const newPrompt = await createPrompt(input);
      setPrompts((prev) => [newPrompt, ...prev]);
      return newPrompt;
    },
    [],
  );

  /**
   * プロンプトを更新
   */
  const update = useCallback(
    async (id: string, patch: UpdatePromptInput): Promise<Prompt> => {
      const updated = await updatePrompt(id, patch);
      setPrompts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    },
    [],
  );

  /**
   * プロンプトを削除
   */
  const remove = useCallback(async (id: string): Promise<void> => {
    await deletePrompt(id);
    setPrompts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  /**
   * プロンプトの最終利用日時を更新
   */
  const markAsUsed = useCallback(async (id: string): Promise<void> => {
    console.log(`[markAsUsed] Marking prompt ${id} as used`);
    try {
      const updated = await updateLastUsed(id);
      console.log(`[markAsUsed] Received updated prompt:`, updated);
      // ローカル状態を更新してソート順を反映
      setPrompts((prev) => {
        console.log(`[markAsUsed] Previous prompts count:`, prev.length);
        const updatedList = prev.map((p) => (p.id === id ? updated : p));
        // 新しい配列を作成してソート（Reactの状態変更検知のため）
        const sortedList = [...updatedList].sort((a, b) => {
          const aLastUsed = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
          const bLastUsed = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;

          if (aLastUsed !== bLastUsed) {
            return bLastUsed - aLastUsed;
          }

          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        console.log(
          `[markAsUsed] Sorted prompts:`,
          sortedList.map((p) => ({
            id: p.id,
            title: p.title,
            lastUsedAt: p.lastUsedAt,
          })),
        );
        return sortedList;
      });
      console.log(`[markAsUsed] State update completed`);
    } catch (error) {
      console.error(`[markAsUsed] Error:`, error);
      throw error;
    }
  }, []);

  return {
    prompts,
    isLoading,
    error,
    reload: loadPrompts,
    create,
    update,
    remove,
    markAsUsed,
  };
}
