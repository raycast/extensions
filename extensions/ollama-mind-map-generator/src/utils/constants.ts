export const MIND_MAP_PROMPT = `You are a specialized mind map generator that creates markmap-compatible markdown output. Your task is to analyze the provided text and create a hierarchical mind map structure using markdown syntax.

Rules for generating the mind map:
1. Use markdown headings (#, ##, ###, etc.) for main topics and subtopics
2. Use bullet points (-) for listing details under topics
3. Maintain a clear hierarchical structure with maximum 4 levels of depth
4. Keep entries concise and meaningful - aim for 2-5 words per node
5. Include all relevant information from the source text
6. Group related concepts together under common parent nodes
7. Always start with a clear main topic using a descriptive emoji
8. Use relevant emojis for all main sections
9. Format special elements properly:
   - Links: [text](URL) for external references
   - Emphasis: **bold** for key concepts, *italic* for definitions
   - Code: \`inline code\` for technical terms
10. Organize information hierarchically:
    - Level 1 (#): Main topic with overview emoji
    - Level 2 (##): Major sections with relevant emojis
    - Level 3 (###): Subsections and details
    - Level 4 (####): Specific points when needed

Example format:
# 🎯 Main Topic
## 📋 Key Aspect 1
### Important Concept
- Core point one
- Core point two
## 💡 Key Aspect 2
### Implementation Details
1. First step
2. Second step
### Related Information
- Additional details
- Supporting facts

Generate a clear, well-structured mind map for the following text: `;

export const KEYWORD_PROMPT = `Generate a single, concise keyword (maximum 40 characters) that captures the main topic of this text.

Requirements:
- ONE word only
- NO spaces
- NO special characters
- ONLY lowercase letters and numbers
- Maximum 40 characters
- Must be descriptive and meaningful

Examples of good keywords:
- "mindmap" for text about mind mapping
- "kubernetes" for text about Kubernetes
- "typescript" for text about TypeScript
- "networking" for text about computer networks

Examples of bad keywords:
- "this_article" (contains special character)
- "mind mapping" (contains space)
- "thisisaverylongkeyword" (too long)
- "article" (too generic)

Respond with exactly one keyword and nothing else.

Text to analyze: `;

export const HTML_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Markmap</title>
  <style>
    * { margin: 0; padding: 0; }
    #mindmap { height: 100vh; width: 100vw; }
  </style>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/markmap-toolbar@0.15.3/dist/style.css">
</head>
<body>
  <svg id="mindmap"></svg>
  <script src="https://cdn.jsdelivr.net/npm/d3@7.8.5/dist/d3.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/markmap-view@0.15.3/dist/browser/index.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/markmap-toolbar@0.15.3/dist/index.js"></script>
  <script>
    (async () => {
      const { markmap } = window;
      const { Markmap, loadCSS, loadJS } = markmap;
      const { toolbar } = window.markmap;
      const svg = document.querySelector('#mindmap');
      const mm = Markmap.create(svg);
      const data = __DATA__;
      mm.setData(data);
      toolbar.create(mm);
    })();
  </script>
</body>
</html>
`;
