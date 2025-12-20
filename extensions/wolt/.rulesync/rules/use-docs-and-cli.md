---
targets:
  - cursor
  - claudecode
  - codexcli
root: false
description: "Guide agents to first try using docs and tools"
globs:
  - "**/*"
cursor:
  alwaysApply: true
  globs:
    - "**/*"
---

# Use Documentation and CLI Utilities First

**CRITICAL**: Never invent or solve solutions from first principles. Always check documentation and use CLI utilities before creating custom implementations.

## General Principles

1. **Documentation First**: Before implementing any solution, check relevant documentation using available tools:

   - Use shadcn and Context7 MCP tools to explore components, examples, and documentation
   - Search the codebase for similar implementations before creating new ones
   - Search the web for solutions to the problem you've encountered

2. **CLI Utilities Over Manual Implementation**: Always prefer using official CLI tools and generators:
   - Use `npx shadcn@latest add <component>` instead of manually creating components
   - Use project generators (e.g., `create-next-app`, `create-react-app`) instead of manual setup
   - Use official CLI tools for configuration (e.g., `eslint --init`, `prettier --init`)
   - Prefer library-provided generators over manual implementation

3. **No First-Principles Solutions**: Do not:

   - Create components from scratch when shadcn/ui or other libraries provide them
   - Manually set up project structures when generators exist
   - Implement features that are available through official tools or utilities
   - Guess configuration values - always check documentation or existing examples
   - Debug errors using unusual methods without first searching for known solutions

4. **Debugging Errors**: Always search first:
   - **Always** use `web_search` tool when encountering errors or unexpected behavior
   - Search for the exact error message, including relevant context (library versions, framework) but excluding user or project specific details (paths, variable names)
   - Check if the error is a known issue with documented solutions
   - Only attempt custom debugging after confirming no known solutions exist

## Workflow for Common Tasks

### Configuration and Setup

1. **First**: Check documentation using appropriate tools (get-library-docs, etc.)
2. **Second**: Look for existing examples in the codebase
3. **Third**: Use official configuration tools or generators
4. **Last resort**: Create custom configuration only if no official method exists

### Debugging Errors

1. **First**: Check official documentation and troubleshooting guides
1. **Second**: Search the web using `web_search` tool for the error message or symptoms
   - Copy the exact error message and search for it
   - Include relevant context (library versions, framework, etc.)
   - Check Stack Overflow, GitHub issues, and official documentation
1. **Third**: Look for similar errors in the codebase or project history
1. **Last resort**: Only then attempt custom debugging approaches
1. **Never**: Try obscure debugging methods without first checking if others have solved the same problem

## Examples of What NOT to Do

❌ **Don't**: Manually create a button component when shadcn/ui provides one (even if you think you can write the same one from scratch!)
❌ **Don't**: Guess libraries configuration values without checking docs
❌ **Don't**: Create custom implementations of features available in libraries
❌ **Don't**: Implement solutions from scratch without checking if tools exist
❌ **Don't**: Try to debug errors using unusual methods without first searching the web
❌ **Don't**: Assume an error is unique - always search for the error message first
❌ **Don't**: Create workarounds for known issues without checking if fixes exist

## Examples of What TO Do

✅ **Do**: Use the shadcn CLI tool to add a button component
✅ **Do**: Use `get-library-docs` tool to understand a library's configuration options
✅ **Do**: Check existing codebase patterns before creating new implementations
✅ **Do**: Search the web first when encountering any error or unexpected behavior
✅ **Do**: Use `web_search` tool with the exact error message (minus any project or user specific details, like paths or filenames) before debugging
✅ **Do**: Check GitHub issues, Stack Overflow, and official docs for error solutions

## When Custom Implementation is Acceptable

Custom implementation is only acceptable when:

1. You have verified that no CLI utility or generator exists for the task
2. You have checked documentation and confirmed the feature doesn't exist
3. You have searched the codebase and found no existing patterns
4. You've searched the web for solutions to your problem
5. The solution is truly unique to this codebase and not a standard pattern

## Summary

1. **Check documentation first** - Use available tools (shadcn, Context7 MCP, web search) before implementing solutions
2. **Prefer CLI utilities** - Use official CLI tools and generators instead of manual implementation
3. **Search before debugging** - Always search the web for error messages before attempting custom debugging
4. **No first-principles solutions** - Don't create components or features from scratch when tools exist
5. **Custom implementation is last resort** - Only implement custom solutions after verifying no tools or patterns exist
