// One smoke test per existing Mermaid family, plus CJK and SVG fidelity probes.
// Passing compilation is not a claim of complete Mermaid compatibility.
export const fixedNow = Date.UTC(2026, 9, 28);
export const fixtures = [
  { name: "flowchart", code: "flowchart LR\n A[Start] --> B{Ready?}\n B -->|Yes| C[Done]" },
  {
    name: "sequence",
    code: "sequenceDiagram\n participant User\n participant API\n User->>API: Request\n API-->>User: Response",
  },
  { name: "class", code: "classDiagram\n Animal <|-- Dog\n Animal : +speak() void" },
  { name: "state", code: "stateDiagram-v2\n [*] --> Ready\n Ready --> Done\n Done --> [*]" },
  { name: "er", code: "erDiagram\n CUSTOMER ||--o{ ORDER : places\n CUSTOMER {\n int id PK\n }" },
  { name: "xychart", code: "xychart-beta\n x-axis [Jan, Feb, Mar]\n y-axis 0 --> 100\n line [20, 70, 40]" },
  { name: "mindmap", code: "mindmap\n root((Project))\n  Design\n  Build\n  Test" },
  { name: "timeline", code: "timeline\n title Delivery\n 2026 : Plan\n 2027 : Ship" },
  { name: "journey", code: "journey\n title Onboarding\n section Setup\n Register: 5: User\n Verify: 3: User" },
  {
    name: "gantt",
    code: "gantt\n dateFormat YYYY-MM-DD\n section Build\n Design :a1, 2026-10-01, 3d\n Test :after a1, 2d",
  },
  { name: "pie", code: 'pie title Work\n "Build" : 60\n "Test" : 40' },
  { name: "git", code: "gitGraph\n commit\n branch develop\n checkout develop\n commit" },
  {
    name: "quadrant",
    code: "quadrantChart\n title Priorities\n x-axis Low --> High\n y-axis Low --> High\n A: [0.3, 0.6]",
  },
  { name: "sankey", code: "sankey-beta\n Source,Target,10\n Target,Done,8" },
  { name: "block", code: "block-beta\n columns 2\n A B\n A --> B" },
  { name: "packet", code: 'packet-beta\n 0-15: "Header"\n 16-31: "Data"' },
  { name: "kanban", code: "kanban\n todo[To Do]\n  task1[Design]\n done[Done]\n  task2[Test]" },
  {
    name: "architecture",
    code: "architecture-beta\n service api(server)[API]\n service db(database)[Database]\n api:R -- L:db",
  },
  {
    name: "requirement",
    code: 'requirementDiagram\n requirement test_req {\n id: 1\n text: "System must respond"\n risk: low\n verifymethod: test\n }',
  },
  { name: "c4", code: 'C4Context\n Person(user, "User")\n System(app, "App")\n Rel(user, app, "Uses")' },
  { name: "radar", code: 'radar-beta\n axis a["Speed"], b["Quality"], c["Cost"]\n curve x["Product"]{80, 70, 60}' },
  { name: "treemap", code: 'treemap-beta\n "Project"\n  "Build": 60\n  "Test": 40' },
  { name: "info", code: "info" },
  { name: "cjk-short", code: "flowchart LR\n A[使用者] --> B[登入驗證]" },
  { name: "cjk-mixed", code: "flowchart LR\n A[使用者 User] --> B[API 服務]" },
  { name: "cjk-long", code: "flowchart TD\n A[請輸入您的使用者名稱與密碼以完成系統登入驗證] --> B[完成]" },
  { name: "cjk-mindmap", code: "mindmap\n root((開發計畫))\n  技術驗證\n  測試與發布" },
  { name: "cjk-timeline", code: "timeline\n title 開發時程\n 2026 : 技術驗證\n 2027 : 正式發布" },
  { name: "colored-edge", code: "flowchart LR\n A --> B\n linkStyle 0 stroke:#ff0000,stroke-width:4px" },
  { name: "multiple-arrows", code: "flowchart LR\n A <--> B\n B -.-> C\n C ==> D" },
  { name: "theme-directive", code: '%%{init: {"theme":"dark"}}%%\nflowchart LR\n A --> B' },
  { name: "theme-frontmatter", code: "---\nconfig:\n  theme: dark\n---\nflowchart LR\n A --> B" },
  {
    name: "cjk-sequence",
    code: "sequenceDiagram\n participant User as 使用者\n participant API as 應用服務\n User->>API: 查詢資料\n API-->>User: 查詢結果",
  },
];
