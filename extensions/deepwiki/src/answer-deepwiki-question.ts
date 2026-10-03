const CHUNK_SIZE = 30000
const CHUNK_OVERLAP = 1000

export async function answerDeepWikiQuestion(
  question: string,
  page: { url: string; content: string },
  ask: (prompt: string) => Promise<string>,
): Promise<string> {
  let context = page.content

  if (context.length > CHUNK_SIZE) {
    const facts: string[] = []
    for (let start = 0; start < page.content.length; start += CHUNK_SIZE - CHUNK_OVERLAP) {
      const chunk = page.content.slice(start, start + CHUNK_SIZE)
      facts.push(
        await ask(
          `Extract the facts relevant to the question from this DeepWiki page excerpt. Use only facts explicitly stated in the excerpt. Keep the extraction concise, preserving details needed to answer. If there are no relevant facts, say so about this excerpt only. Other excerpts will be checked separately.\n\nPage: ${page.url}\n\n${chunk}\n\nQuestion: ${question}`,
        ),
      )
      if (start + CHUNK_SIZE >= page.content.length) break
    }
    context = facts.map((fact, index) => `Excerpt ${index + 1}:\n${fact}`).join("\n\n")
  }

  return ask(
    `Answer the question using the DeepWiki page context below. If the context does not contain the answer, say so. Cite the page URL in your answer.\n\nPage: ${page.url}\n\n${context}\n\nQuestion: ${question}`,
  )
}
