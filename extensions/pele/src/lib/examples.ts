export const EXAMPLES = [
  {
    title: "Flowchart",
    source: "flowchart LR\n  A[Idea] --> B[Build]\n  B --> C{Tests pass?}\n  C -->|Yes| D[Ship]\n  C -->|No| B",
  },
  {
    title: "Sequence Diagram",
    source:
      "sequenceDiagram\n  participant User\n  participant App\n  participant API\n  User->>App: Open dashboard\n  App->>API: Request data\n  API-->>App: Return results\n  App-->>User: Show dashboard",
  },
  {
    title: "Class Diagram",
    source:
      'classDiagram\n  class Project {\n    +String name\n    +addTask()\n  }\n  class Task {\n    +String title\n    +Boolean complete\n  }\n  Project "1" --> "many" Task',
  },
  {
    title: "State Diagram",
    source:
      "stateDiagram-v2\n  [*] --> Draft\n  Draft --> Review\n  Review --> Published: Approved\n  Review --> Draft: Changes requested\n  Published --> [*]",
  },
  {
    title: "Entity Relationship",
    source:
      "erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ ITEM : contains\n  CUSTOMER {\n    string name\n    string email\n  }\n  ITEM {\n    string name\n    float price\n  }",
  },
  { title: "Pie Chart", source: 'pie title Time spent\n  "Building" : 50\n  "Planning" : 20\n  "Reviewing" : 30' },
  {
    title: "Sankey with Config",
    source: `---
config:
  sankey:
    showValues: false
    nodeWidth: 15
    nodePadding: 20
---
sankey

Electricity grid,Heating and cooling - homes,113.726
Electricity grid,Industry,342.165
Electricity grid,Losses,56.691`,
  },
  {
    title: "Mindmap",
    source:
      "mindmap\n  root((Launch))\n    Product\n      Design\n      Development\n    Marketing\n      Website\n      Announcement\n    Support\n      Documentation\n      Feedback",
  },
  {
    title: "Gantt Chart",
    source:
      "gantt\n  title Project plan\n  dateFormat YYYY-MM-DD\n  section Product\n    Design :design, 2026-01-01, 5d\n    Build :build, after design, 10d\n    Test :after build, 3d",
  },
];
