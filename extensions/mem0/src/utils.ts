import { MemoryClient } from "mem0ai";
import { MemoryResult, SearchResponse, GetAllResponse } from "./types";

let memoryClient: MemoryClient | null = null;

function getMemoryClient(apiKey: string): MemoryClient {
  if (!memoryClient) {
    memoryClient = new MemoryClient({
      apiKey,
    });
  }
  return memoryClient;
}

export async function addMemory(apiKey: string, text: string, userId: string): Promise<MemoryResult[]> {
  const memory = getMemoryClient(apiKey);

  const messages = [{ role: "user", content: text }];

  const results = await memory.add(messages, { user_id: userId });

  // Convert SDK response to MemoryResult format
  return results.map((item) => ({
    memory: item.memory || text,
    event: item.event || item.id,
  }));
}

export async function getMemories(
  apiKey: string,
  userId: string,
  page: number = 1,
  pageSize: number = 50,
): Promise<GetAllResponse> {
  const memory = getMemoryClient(apiKey);

  const allMemories = await memory.getAll({ user_id: userId });

  // Simple pagination
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedResults = allMemories.slice(startIndex, endIndex);

  return {
    results: paginatedResults,
  };
}

export async function searchMemories(apiKey: string, query: string, userId: string): Promise<SearchResponse> {
  const memory = getMemoryClient(apiKey);

  const results = await memory.search(query, { user_id: userId });

  return {
    results: results,
  };
}
