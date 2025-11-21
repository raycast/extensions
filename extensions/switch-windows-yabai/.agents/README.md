# AI Context Engineering

This directory contains context engineering documentation for AI assistants working on the Raycast Yabai Window Switcher extension.

## 📁 Directory Structure

```
.agents/
├── AGENTS.md                    # Core instructions and frameworks for AI agents
├── README.md                    # This file - overview and philosophy
├── QUICK_START.md              # Guide for using the starter prompt
├── z__starter_prompt.yaml      # Template for starting AI-assisted development
├── knowledge/                   # Project-specific knowledge base
│   ├── typescript_standards.md
│   ├── react_raycast_patterns.md
│   ├── yabai_integration.md
│   ├── window_management.md
│   ├── testing_strategy.md
│   └── performance_patterns.md
├── prompts/                     # Reusable prompt templates
│   └── code/                   # Code-related prompts
├── redirects/                   # Redirect files for different AI systems
│   ├── CLAUDE.md
│   ├── GEMINI.md
│   ├── WARP.md
│   ├── COPILOT.md
│   └── constitution.md
├── scripts/                    # Helper scripts and automation
└── skills/                     # Specialized skills and workflows
```

## 🎯 Purpose

This context engineering system helps AI assistants:

1. **Understand Project Standards** - Follow established TypeScript/React/Raycast conventions
2. **Make Better Decisions** - Use confidence-based decision frameworks
3. **Avoid Common Pitfalls** - Learn from documented failure patterns
4. **Deliver Consistent Quality** - Apply systematic verification checklists
5. **Integrate with yabai** - Understand window management patterns and CLI integration

## 🚀 Getting Started

### For AI Assistants

1. **First Time in Conversation**: Read `AGENTS.md` thoroughly
2. **Starting Development Task**: Use `z__starter_prompt.yaml` as template
3. **Subsequent Interactions**: Reference that `AGENTS.md` has already been read
4. **Project-Specific Questions**: Consult the `knowledge/` directory
5. **Code Implementation**: Follow patterns in `knowledge/typescript_standards.md` and `knowledge/react_raycast_patterns.md`

### For Human Developers

1. **Starting a Task**: Copy template from `z__starter_prompt.yaml` and fill in details
2. **Quick Reference**: Check `QUICK_START.md` for examples and scenarios
3. **Understanding the System**: Review `AGENTS.md` to see how AI is instructed
4. **Updating Standards**: Modify `knowledge/` files when project standards change
5. **Adding Patterns**: Document new patterns and guidelines as they evolve
6. **Staying Synced**: Keep documentation aligned with actual codebase

## 📚 Key Documents

### Getting Started
- **QUICK_START.md** - Practical guide with examples for using the starter prompt
- **z__starter_prompt.yaml** - Template for AI-assisted development tasks

### Core Framework
- **AGENTS.md** - Complete instruction set for AI behavior, decision-making, and quality standards

### Knowledge Base
- **typescript_standards.md** - TypeScript conventions and strict mode usage
- **react_raycast_patterns.md** - React hooks, Raycast API patterns, component structure
- **yabai_integration.md** - Yabai CLI commands, window/display/space management
- **window_management.md** - Window listing patterns, actions, usage tracking
- **testing_strategy.md** - Testing approaches with Jest and mocking strategies
- **performance_patterns.md** - Rendering optimization, caching, search performance

### Redirects
- **CLAUDE.md / WARP.md / COPILOT.md / GEMINI.md** - Platform-specific entry points that redirect to AGENTS.md
- **constitution.md** - Shared redirect for all AI systems

## 🔄 Maintenance

### When to Update

- **Code Standards Change**: Update `knowledge/typescript_standards.md`
- **New Patterns Emerge**: Document in relevant knowledge files
- **Common Mistakes Occur**: Add to failure patterns in `AGENTS.md`
- **Process Improvements**: Update workflow documentation
- **Yabai Commands Added**: Update `knowledge/yabai_integration.md`

### How to Update

1. Edit the relevant markdown file
2. Keep changes focused and specific
3. Update examples to match current codebase
4. Review for clarity and accuracy
5. Commit with descriptive message

## 💡 Best Practices

### For Effective Context Engineering

1. **Be Specific**: Provide concrete examples over abstract principles
2. **Stay Current**: Keep documentation synchronized with code
3. **Show Don't Tell**: Use code snippets to demonstrate patterns
4. **Focus on Common Cases**: Document frequent scenarios first
5. **Maintain Consistency**: Use consistent terminology and structure

### For AI Interactions

1. **Trust the System**: AGENTS.md contains comprehensive instructions
2. **Reference Knowledge**: Point to specific knowledge base documents
3. **Ask When Uncertain**: Follow confidence thresholds in AGENTS.md
4. **Validate Changes**: Use pre-code checklists before implementing

## 🎓 Philosophy

This context engineering approach is based on:

- **Clarity over Cleverness**: Simple, direct instructions
- **Evidence over Assumptions**: Cite sources, verify claims
- **Quality over Speed**: Systematic checks prevent costly mistakes
- **Learning from Failure**: Document and prevent common pitfalls
- **Performance Matters**: Optimize for rendering and user experience

## 🤝 Contributing

When adding new documentation:

1. Follow the structure in existing knowledge files
2. Use clear, actionable language
3. Include examples from the actual codebase
4. Cross-reference related documents
5. Test with AI assistants to verify effectiveness

---

**Version**: 1.0
**Last Updated**: 2024-11-21
**Maintained By**: Development Team
