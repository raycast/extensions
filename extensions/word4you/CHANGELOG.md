# Word4you Changelog

## [Add compose command] - 2025-12-05

- Add a new command "Compose" to generate sentences with random 2 words using LLM providers
- Bump cli version to support the new compose feature
- Move preferences to extension preferences for better user experience

## [Initial Version] - 2025-08-14

- Add Wrapper to consume word4you CLI
- Query word/phrase/sentence with structured response using Gemini and save it to local markdown file
- Support for both Gemini and Qwen AI providers
- Support for English, Chinese, and mixed language queries
- List all entries in vocabulary notebook
- Delete entry from vocabulary notebook
- Regenerate explanation and update it in vocabulary notebook
- Integrate with Git for backup/sync with smart conflict resolution