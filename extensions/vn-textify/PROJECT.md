Project Name: Vietnamese Telex Tranformer
Category: Productivity / Text Manipulation Tool

Problem Statement: Standard Vietnamese IMEs (Telex/VNI) often interfere with coding, terminal commands, or English-Vietnamese mixed typing. Switching keyboard modes (EN/VI) manually is a high-friction task that breaks the developer's flow.

The Solution: A "Freeflow" transformation tool. It treats Vietnamese typing as a post-processing task rather than an input-stream task. By selecting a block of text and executing a command, the tool parses Telex marks and replaces the selection with Unicode-compliant Vietnamese.

Technical Stack: * Platform: Raycast (macOS)

Language: TypeScript / React

Engine: Custom State-Machine Parser (telex.js)

Key Logic: Implements a two-pass parser that identifies modifiers (aa, dd, ow) and consumes tone markers (s, f, r, x, j) at the end of word boundaries.