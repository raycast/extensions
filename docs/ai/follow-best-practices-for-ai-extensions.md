---
description: Make the most out of your AI Extension by following best practices.
---

# Follow Best Practices for AI Extensions

Working with LLMs can be tricky. Here are some best practices to make the most out of your AI Extension.

1. Use [Confirmations](./learn-core-concepts-of-ai-extensions.md#confirmations) to keep the human in the loop. You can use them dynamically based on the user's input. For example, you might ask for confirmation if moving a file would overwrite an existing file but not if it would create a new file.
2. Write [Evals](./write-evals-for-your-ai-extension.md) for common use-cases to test your AI Extension and provide users with suggested prompts.
3. Include information in your tool's input on how to format parameters like IDs or dates. For example, you might mention that a date should be provided in ISO 8601 format.
4. Include information in your tool's input on how to get the required parameters. For example, you want to teach AI how to get a team ID that is required to create a new issue.
