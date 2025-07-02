export const MERMAID_EXAMPLES = [
  {
    title: "Simple Flowchart",
    code: `graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B`,
  },
  {
    title: "Sequence Diagram",
    code: `sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Hello Bob, how are you?
    B-->>A: Great!
    A->>B: See you later!`,
  },
  {
    title: "Class Diagram",
    code: `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +bark()
    }
    class Cat {
        +boolean indoor
        +meow()
    }
    Animal <|-- Dog
    Animal <|-- Cat`,
  },
  {
    title: "State Diagram",
    code: `stateDiagram-v2
    [*] --> Still
    Still --> [*]
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]`,
  },
  {
    title: "Gantt Chart",
    code: `gantt
    title Project Timeline
    dateFormat  YYYY-MM-DD
    section Setup
    Task 1    :a1, 2024-01-01, 30d
    Task 2    :after a1, 20d
    section Development
    Task 3    :2024-02-01, 12d
    Task 4    :24d`,
  },
  {
    title: "Pie Chart",
    code: `pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15`,
  },
];

export const DIAGRAM_TYPES_HELP = `
## Valid Mermaid Diagram Types:
- \`graph TD\` or \`flowchart TD\` - Flowcharts
- \`sequenceDiagram\` - Sequence diagrams  
- \`classDiagram\` - Class diagrams
- \`stateDiagram-v2\` - State diagrams
- \`erDiagram\` - Entity relationship diagrams
- \`journey\` - User journey diagrams
- \`gantt\` - Gantt charts
- \`pie\` - Pie charts
- \`gitgraph\` - Git graphs
- \`requirement\` - Requirements diagrams
`;

export function validateMermaidCode(code: string): string | undefined {
  if (!code.trim()) {
    return "Mermaid code is required";
  }

  // Basic validation for common Mermaid diagram types
  const trimmedCode = code.trim();
  const validStarters = [
    "graph",
    "digraph",
    "flowchart",
    "sequenceDiagram",
    "classDiagram",
    "stateDiagram",
    "erDiagram",
    "journey",
    "gantt",
    "pie",
    "gitgraph",
    "requirement",
    "mindmap",
    "timeline",
    "zenuml",
    "sankey",
  ];

  const hasValidStarter = validStarters.some((starter) => trimmedCode.toLowerCase().startsWith(starter.toLowerCase()));

  if (!hasValidStarter) {
    return "Please enter valid Mermaid syntax (e.g., starting with 'graph TD', 'sequenceDiagram', etc.)";
  }

  return undefined;
}
