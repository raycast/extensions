# File Recall Changelog

## [Initial Version] - {PR_MERGE_DATE}

- AI agent with autonomous reasoning (ReAct pattern) for file search
- Natural language file search powered by macOS Spotlight (`mdfind`)
- 8 built-in agent tools: `search_files`, `find_directories`, `read_file_preview`, `grep_files`, `get_file_metadata`, `analyze_image`, `list_recent_files`, `finish`
- Content verification via text grep, rich metadata extraction, and multimodal image analysis
- Interactive refinement with follow-up questions
- Image thumbnails and media type badges in results
- Support for any OpenAI-compatible API (OpenAI, DeepSeek, local models, etc.)
- Automatic fallback for API providers without native function calling support
- Progressive widening search strategy for better recall
