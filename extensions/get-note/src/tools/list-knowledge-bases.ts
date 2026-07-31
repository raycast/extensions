import { listKnowledgeBases } from "../lib/api";

export default async function listKnowledgeBasesTool() {
  const data = await listKnowledgeBases();

  return {
    count: data.topics?.length || 0,
    topics: (data.topics || []).map((topic) => ({
      topicId: topic.topic_id,
      name: topic.name,
      description: topic.description,
      noteCount: topic.stats?.note_count ?? 0,
      fileCount: topic.stats?.file_count ?? 0,
      bloggerCount: topic.stats?.blogger_count ?? 0,
      liveCount: topic.stats?.live_count ?? 0,
    })),
  };
}
