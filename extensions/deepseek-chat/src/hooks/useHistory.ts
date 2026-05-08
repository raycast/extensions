import { useState, useEffect } from 'react';
import { loadHistory, saveHistory } from '../utils/storage';

export interface HistoryEntry {
  id: string;
  question: string;
  answer: string;
  model: string;
  timestamp: number;
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);

  const addEntry = async (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    const updated = [newEntry, ...history].slice(0, 50);
    setHistory(updated);
    await saveHistory(updated);
  };

  const clearHistory = async () => {
    setHistory([]);
    await saveHistory([]);
  };

  return { history, addEntry, clearHistory };
}
