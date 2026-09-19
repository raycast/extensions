import type { ChartType } from "../lib/catalog";
import { ECHARTS_OPTIONS } from "./echarts-options";
import { ECHARTS_OPTION, MERMAID_DOCS, SHADCN_CHARTS } from "./urls";

const mermaidDocs = (page: string) => `${MERMAID_DOCS}/${page}.html`;
const shadcnDocs = (page: string) => `${SHADCN_CHARTS}/${page}`;
const echartsDocs = (series: string) => `${ECHARTS_OPTION}-${series}`;

/**
 * The catalog. Order within a family is the order shown.
 * `since` is the Mermaid release that added the type, checked against the
 * release notes on 17 September 2026; absent means long-standing.
 */
export const CHARTS: ChartType[] = [
  // Flow and process
  {
    id: "flowchart",
    name: "Flowchart",
    family: "flow",
    synonyms: ["flow", "process", "decision tree", "graph"],
    use: "Steps and decisions in order, with branches.",
    mermaid: {
      keyword: "flowchart",
      docs: mermaidDocs("flowchart"),
      template: `flowchart TD
  A[Start] --> B{Is it ready?}
  B -->|Yes| C[Ship it]
  B -->|No| D[Fix it]
  D --> B`,
      hint: "Use TD for top to bottom or LR for left to right. Keep node labels short.",
    },
  },
  {
    id: "sequence",
    name: "Sequence",
    family: "flow",
    synonyms: ["interaction", "messages", "request response", "api call"],
    use: "Who sends what to whom, in time order.",
    mermaid: {
      keyword: "sequenceDiagram",
      docs: mermaidDocs("sequenceDiagram"),
      template: `sequenceDiagram
  participant U as User
  participant S as Server
  U->>S: Request
  S-->>U: Response`,
      hint: "Solid arrows for calls, dashed for replies. Name participants with aliases.",
    },
  },
  {
    id: "state",
    name: "State",
    family: "flow",
    synonyms: ["state machine", "lifecycle", "transitions", "status"],
    use: "The states something can be in and what moves it between them.",
    mermaid: {
      keyword: "stateDiagram-v2",
      docs: mermaidDocs("stateDiagram"),
      template: `stateDiagram-v2
  [*] --> Draft
  Draft --> Review: submit
  Review --> Draft: request changes
  Review --> Published: approve
  Published --> [*]`,
    },
  },
  {
    id: "journey",
    name: "User Journey",
    family: "flow",
    synonyms: ["customer journey", "experience", "touchpoints", "satisfaction"],
    use: "A user's path through a task with a score per step.",
    mermaid: {
      keyword: "journey",
      docs: mermaidDocs("userJourney"),
      template: `journey
  title Buying a coffee
  section Order
    Choose a drink: 5: Customer
    Pay: 3: Customer
  section Collect
    Wait: 2: Customer
    Pick up: 4: Customer, Barista`,
      hint: "Scores run 1 to 5. Each step names the actors after the score.",
    },
  },
  {
    id: "gitgraph",
    name: "Git Graph",
    family: "flow",
    synonyms: ["branches", "commits", "merge", "release flow"],
    use: "Branches, commits and merges over time.",
    mermaid: {
      keyword: "gitGraph",
      docs: mermaidDocs("gitgraph"),
      template: `gitGraph
  commit
  branch feature
  checkout feature
  commit
  commit
  checkout main
  merge feature
  commit`,
    },
  },
  {
    id: "sankey",
    name: "Sankey",
    family: "flow",
    synonyms: ["flow of money", "energy flow", "allocation", "where it goes"],
    use: "How a quantity splits and flows from sources to destinations.",
    mermaid: {
      keyword: "sankey-beta",
      since: "10.3",
      docs: mermaidDocs("sankey"),
      template: `sankey-beta

Budget,Housing,1200
Budget,Food,600
Budget,Savings,400
Housing,Rent,1100
Housing,Bills,100`,
      hint: "Three columns per line: source, target, value. No header row.",
    },
    echarts: { series: "sankey", docs: echartsDocs("sankey"), option: ECHARTS_OPTIONS.sankey },
  },
  {
    id: "eventmodeling",
    name: "Event Modeling",
    family: "flow",
    synonyms: ["event storming", "commands and events", "cqrs", "timeline of events"],
    use: "Commands, events and views along a system timeline.",
    mermaid: {
      keyword: "eventmodeling",
      since: "11.15",
      docs: mermaidDocs("eventmodeling"),
      template: `eventmodeling

tf 01 ui CartUI
tf 02 cmd AddItem
tf 03 evt ItemAdded
tf 04 rmo CartView`,
      hint: "Each line is a frame: tf, a number, the kind (ui, cmd, evt, rmo) and a name.",
    },
  },
  {
    id: "swimlanes",
    name: "Swimlanes",
    family: "flow",
    synonyms: ["cross functional", "lanes", "responsibilities", "handoffs"],
    use: "A process split by who does each step.",
    mermaid: {
      keyword: "swimlane-beta",
      since: "11.16",
      docs: mermaidDocs("swimlanes"),
      template: `swimlane-beta LR
  subgraph Customer
    Browse[Browse catalog]
    Pay[Pay]
  end
  subgraph Warehouse
    Pick[Pick items]
    Ship[Ship order]
  end
  Browse --> Pay
  Pay --> Pick
  Pick --> Ship`,
      hint: "One subgraph per lane. Edges may cross lanes.",
    },
  },

  {
    id: "chord",
    name: "Chord",
    family: "flow",
    synonyms: ["circular flow", "relationships", "migration", "dependency wheel"],
    use: "Flows between a set of things arranged in a circle, ribbon width for volume.",
    echarts: { series: "chord", docs: echartsDocs("chord"), option: ECHARTS_OPTIONS.chord },
  },

  // Structure
  {
    id: "architecture",
    name: "Architecture",
    family: "structure",
    synonyms: ["system design", "infrastructure", "cloud", "services"],
    use: "Services, storage and how they connect, with icons.",
    mermaid: {
      keyword: "architecture-beta",
      since: "11.1",
      docs: mermaidDocs("architecture"),
      template: `architecture-beta
  group api(cloud)[API]

  service db(database)[Database] in api
  service disk(disk)[Storage] in api
  service server(server)[Server] in api

  db:L -- R:server
  disk:T -- B:server`,
      hint: "Stick to the built-in icons (cloud, database, disk, internet, server) unless the renderer registers icon packs.",
    },
  },
  {
    id: "class",
    name: "Class",
    family: "structure",
    synonyms: ["uml", "object model", "inheritance", "types"],
    use: "Types, their members and how they relate.",
    mermaid: {
      keyword: "classDiagram",
      docs: mermaidDocs("classDiagram"),
      template: `classDiagram
  class Animal {
    +String name
    +speak()
  }
  class Dog {
    +fetch()
  }
  Animal <|-- Dog`,
    },
  },
  {
    id: "er",
    name: "Entity Relationship",
    family: "structure",
    synonyms: ["erd", "database schema", "tables", "data model"],
    use: "Entities and the cardinality of the links between them.",
    mermaid: {
      keyword: "erDiagram",
      docs: mermaidDocs("entityRelationshipDiagram"),
      template: `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  CUSTOMER {
    string name
    string email
  }`,
    },
  },
  {
    id: "c4",
    name: "C4 Context",
    family: "structure",
    synonyms: ["c4 model", "system context", "container diagram", "software architecture"],
    use: "A system, its users and the external systems around it.",
    mermaid: {
      keyword: "C4Context",
      docs: mermaidDocs("c4"),
      template: `C4Context
  title System context
  Person(user, "User", "Places orders")
  System(shop, "Shop", "Takes orders")
  System_Ext(mail, "Mail provider", "Sends receipts")
  Rel(user, shop, "Uses")
  Rel(shop, mail, "Sends email")`,
      hint: "Mermaid marks C4 as experimental; layout control is limited.",
    },
  },
  {
    id: "block",
    name: "Block",
    family: "structure",
    synonyms: ["block diagram", "boxes", "layout", "components"],
    use: "Boxes on a grid with explicit columns and connections.",
    mermaid: {
      keyword: "block-beta",
      since: "10.8",
      docs: mermaidDocs("block"),
      template: `block-beta
  columns 3
  a["Input"] b["Process"] c["Output"]
  a --> b
  b --> c`,
    },
  },
  {
    id: "packet",
    name: "Packet",
    family: "structure",
    synonyms: ["byte layout", "protocol", "bit fields", "header"],
    use: "The bit layout of a packet or header.",
    mermaid: {
      keyword: "packet-beta",
      since: "11.0",
      docs: mermaidDocs("packet"),
      template: `packet-beta
0-15: "Source port"
16-31: "Destination port"
32-63: "Sequence number"
64-95: "Acknowledgement number"
96-99: "Offset"
100-105: "Reserved"
106-111: "Flags"
112-127: "Window"`,
    },
  },
  {
    id: "requirement",
    name: "Requirement",
    family: "structure",
    synonyms: ["sysml", "traceability", "verification", "specs"],
    use: "Requirements, the elements that satisfy them and how they are verified.",
    mermaid: {
      keyword: "requirementDiagram",
      docs: mermaidDocs("requirementDiagram"),
      template: `requirementDiagram
  requirement login {
    id: 1
    text: Users can sign in
    risk: medium
    verifymethod: test
  }
  element auth_service {
    type: service
  }
  auth_service - satisfies -> login`,
    },
  },

  {
    id: "network",
    name: "Network Graph",
    family: "structure",
    synonyms: ["graph", "nodes and edges", "force directed", "topology", "dependencies"],
    use: "Nodes and the links between them, laid out by force or in a circle.",
    echarts: {
      series: "graph",
      docs: echartsDocs("graph"),
      option: ECHARTS_OPTIONS.network,
      hint: "Set layout to force or circular; a Mermaid flowchart is the nearest thing when you need Mermaid.",
    },
  },

  // Hierarchy and part to whole
  {
    id: "mindmap",
    name: "Mindmap",
    family: "hierarchy",
    synonyms: ["brainstorm", "ideas", "outline", "radial tree"],
    use: "A central idea branching into topics and subtopics.",
    mermaid: {
      keyword: "mindmap",
      docs: mermaidDocs("mindmap"),
      template: `mindmap
  root((Product))
    Users
      Onboarding
      Retention
    Revenue
      Pricing
      Upsell`,
      hint: "Indentation sets the level. The root uses double brackets for a circle.",
    },
    echarts: {
      series: "tree",
      docs: echartsDocs("tree"),
      option: ECHARTS_OPTIONS.mindmap,
      hint: "ECharts draws a tree layout; set layout to radial for the closest match to a mindmap.",
    },
  },
  {
    id: "treeview",
    name: "Tree View",
    family: "hierarchy",
    synonyms: ["file tree", "folder structure", "directory", "org chart", "outline"],
    use: "A nested structure shown as an indented tree, such as files and folders.",
    mermaid: {
      keyword: "treeView-beta",
      since: "11.14",
      docs: mermaidDocs("treeView"),
      template: `treeView-beta
├── src/
│   ├── index.ts
│   └── utils.ts
├── package.json
└── README.md`,
      hint: "Use the box-drawing characters exactly as shown; indentation is two spaces per level.",
    },
    echarts: { series: "tree", docs: echartsDocs("tree"), option: ECHARTS_OPTIONS.treeview },
  },
  {
    id: "treemap",
    name: "Treemap",
    family: "hierarchy",
    synonyms: ["nested rectangles", "size by value", "disk usage", "budget breakdown"],
    use: "Nested categories sized by value.",
    mermaid: {
      keyword: "treemap-beta",
      since: "11.8",
      docs: mermaidDocs("treemap"),
      template: `treemap-beta
"Engineering"
    "Platform": 12
    "Mobile": 8
"Design"
    "Product": 5
    "Brand": 3`,
      hint: "Quote every label. A line without a value is a group; indented lines with values are its children.",
    },
    echarts: { series: "treemap", docs: echartsDocs("treemap"), option: ECHARTS_OPTIONS.treemap },
  },
  {
    id: "sunburst",
    name: "Sunburst",
    family: "hierarchy",
    synonyms: ["radial treemap", "multilevel pie", "rings", "hierarchy pie"],
    use: "A hierarchy as concentric rings, each ring one level deeper.",
    echarts: { series: "sunburst", docs: echartsDocs("sunburst"), option: ECHARTS_OPTIONS.sunburst },
  },
  {
    id: "pie",
    name: "Pie and Donut",
    family: "hierarchy",
    synonyms: ["donut", "doughnut", "share", "proportion", "percentage"],
    use: "Shares of one whole, when there are only a few slices.",
    mermaid: {
      keyword: "pie",
      docs: mermaidDocs("pie"),
      template: `pie showData
  title Traffic by source
  "Search" : 45
  "Direct" : 30
  "Social" : 25`,
      hint: "Mermaid draws a full pie only; there is no donut option.",
    },
    shadcn: { family: "pie", block: "chart-pie-donut", docs: shadcnDocs("pie") },
    echarts: { series: "pie", docs: echartsDocs("pie"), option: ECHARTS_OPTIONS.pie },
  },

  // Quantity
  {
    id: "bar",
    name: "Bar",
    family: "quantity",
    synonyms: ["column", "histogram", "comparison", "grouped bar", "stacked bar"],
    use: "Values compared across categories.",
    mermaid: {
      keyword: "xychart-beta",
      since: "10.6",
      docs: mermaidDocs("xyChart"),
      template: `xychart-beta
  title "Revenue by quarter"
  x-axis [Q1, Q2, Q3, Q4]
  y-axis "Revenue (k)" 0 --> 120
  bar [60, 75, 90, 110]`,
      hint: "One series per bar line. Add `horizontal` after the keyword for horizontal bars.",
    },
    shadcn: { family: "bar", block: "chart-bar-default", docs: shadcnDocs("bar") },
    echarts: { series: "bar", docs: echartsDocs("bar"), option: ECHARTS_OPTIONS.bar },
  },
  {
    id: "line",
    name: "Line",
    family: "quantity",
    synonyms: ["trend", "time series", "over time", "multi line"],
    use: "How values change over an ordered axis, usually time.",
    mermaid: {
      keyword: "xychart-beta",
      since: "10.6",
      docs: mermaidDocs("xyChart"),
      template: `xychart-beta
  title "Signups per month"
  x-axis [Jan, Feb, Mar, Apr, May, Jun]
  y-axis "Signups" 0 --> 500
  line [120, 180, 240, 310, 390, 460]`,
      hint: "Bar and line series can share one chart.",
    },
    shadcn: { family: "line", block: "chart-line-default", docs: shadcnDocs("line") },
    echarts: { series: "line", docs: echartsDocs("line"), option: ECHARTS_OPTIONS.line },
  },
  {
    id: "area",
    name: "Area",
    family: "quantity",
    synonyms: ["stacked area", "filled line", "cumulative", "volume over time"],
    use: "A line chart with the space beneath filled, good for totals and stacks.",
    shadcn: { family: "area", block: "chart-area-default", docs: shadcnDocs("area") },
    echarts: {
      series: "line",
      docs: echartsDocs("line"),
      option: ECHARTS_OPTIONS.area,
      hint: "An area chart in ECharts is a line series with areaStyle set.",
    },
  },
  {
    id: "radar",
    name: "Radar",
    family: "quantity",
    synonyms: ["spider", "web", "star", "kiviat", "skills", "scorecard"],
    use: "Several things scored on the same five to eight axes.",
    mermaid: {
      keyword: "radar-beta",
      since: "11.6",
      docs: mermaidDocs("radar"),
      template: `radar-beta
  title Skills
  axis d["Design"], c["Code"], o["Ops"], w["Writing"], s["Sales"]
  curve me["Me"]{4, 5, 3, 4, 2}
  curve team["Team"]{3, 4, 4, 3, 4}
  max 5
  min 0`,
      hint: "Every curve needs one value per axis, in axis order.",
    },
    shadcn: { family: "radar", block: "chart-radar-default", docs: shadcnDocs("radar") },
    echarts: { series: "radar", docs: echartsDocs("radar"), option: ECHARTS_OPTIONS.radar },
  },
  {
    id: "radial",
    name: "Radial Bar",
    family: "quantity",
    synonyms: ["progress ring", "circular progress", "circular bar", "activity ring"],
    use: "One or more values as arcs around a circle, often a progress readout.",
    shadcn: { family: "radial", block: "chart-radial-simple", docs: shadcnDocs("radial") },
    echarts: {
      series: "bar",
      docs: echartsDocs("bar"),
      option: ECHARTS_OPTIONS.radial,
      hint: "A bar series on a polar coordinate system.",
    },
  },
  {
    id: "gauge",
    name: "Gauge",
    family: "quantity",
    synonyms: ["dial", "speedometer", "meter", "kpi"],
    use: "One value against a range, read like a dial.",
    echarts: { series: "gauge", docs: echartsDocs("gauge"), option: ECHARTS_OPTIONS.gauge },
    notes: "shadcn's radial chart with center text is the nearest recipe.",
  },
  {
    id: "scatter",
    name: "Scatter",
    family: "quantity",
    synonyms: ["bubble", "dot plot", "xy", "correlation"],
    use: "Two numeric variables per point, to see correlation and outliers.",
    echarts: { series: "scatter", docs: echartsDocs("scatter"), option: ECHARTS_OPTIONS.scatter },
  },
  {
    id: "heatmap",
    name: "Heatmap",
    family: "quantity",
    synonyms: ["matrix", "density", "grid of values"],
    use: "A grid of values colored by magnitude.",
    echarts: { series: "heatmap", docs: echartsDocs("heatmap"), option: ECHARTS_OPTIONS.heatmap },
  },
  {
    id: "funnel",
    name: "Funnel",
    family: "quantity",
    synonyms: ["pipeline", "conversion", "drop off", "stages"],
    use: "Stages that narrow, such as visitors to customers.",
    echarts: { series: "funnel", docs: echartsDocs("funnel"), option: ECHARTS_OPTIONS.funnel },
  },
  {
    id: "boxplot",
    name: "Box Plot",
    family: "quantity",
    synonyms: ["box and whisker", "distribution", "quartiles", "spread"],
    use: "The spread of a distribution: median, quartiles and outliers.",
    echarts: { series: "boxplot", docs: echartsDocs("boxplot"), option: ECHARTS_OPTIONS.boxplot },
  },
  {
    id: "candlestick",
    name: "Candlestick",
    family: "quantity",
    synonyms: ["ohlc", "stock", "price", "trading"],
    use: "Open, high, low and close per period.",
    echarts: { series: "candlestick", docs: echartsDocs("candlestick"), option: ECHARTS_OPTIONS.candlestick },
  },
  {
    id: "pictorial",
    name: "Pictorial Bar",
    family: "quantity",
    synonyms: ["isotype", "icon bar", "repeated symbols", "infographic"],
    use: "Bars built from repeated symbols, for counts that should read as things.",
    echarts: {
      series: "pictorialBar",
      docs: echartsDocs("pictorialBar"),
      option: ECHARTS_OPTIONS.pictorial,
      hint: "symbol takes a built-in shape or an image URL; symbolRepeat stacks it to the value.",
    },
  },
  {
    id: "parallel",
    name: "Parallel Coordinates",
    family: "quantity",
    synonyms: ["multivariate", "dimensions", "profiles", "comparison across attributes"],
    use: "Many items compared across several measures at once, one vertical axis per measure.",
    echarts: {
      series: "parallel",
      docs: echartsDocs("parallel"),
      option: ECHARTS_OPTIONS.parallel,
      hint: "parallelAxis lists one axis per dimension; each data row has one value per axis.",
    },
  },

  // Time and planning
  {
    id: "gantt",
    name: "Gantt",
    family: "time",
    synonyms: ["schedule", "project plan", "roadmap", "tasks over time"],
    use: "Tasks on a calendar with durations and dependencies.",
    mermaid: {
      keyword: "gantt",
      docs: mermaidDocs("gantt"),
      template: `gantt
  title Release plan
  dateFormat YYYY-MM-DD
  section Build
    Design    :a1, 2026-10-01, 7d
    Implement :a2, after a1, 14d
  section Ship
    Review    :a3, after a2, 3d`,
      hint: "Use `after` to chain tasks rather than repeating dates.",
    },
  },
  {
    id: "timeline",
    name: "Timeline",
    family: "time",
    synonyms: ["history", "milestones", "chronology", "events by year"],
    use: "Events in order along a line, grouped by period.",
    mermaid: {
      keyword: "timeline",
      docs: mermaidDocs("timeline"),
      template: `timeline
  title Company history
  2019 : Founded
  2021 : First customer
  2024 : Series A
       : First hire abroad`,
      hint: "A line starting with a colon adds another event to the same period.",
    },
  },
  {
    id: "kanban",
    name: "Kanban",
    family: "time",
    synonyms: ["board", "columns", "to do", "in progress", "workflow"],
    use: "Work items in status columns.",
    mermaid: {
      keyword: "kanban",
      since: "11.4",
      docs: mermaidDocs("kanban"),
      template: `kanban
  todo[To do]
    t1[Write the brief]
  doing[In progress]
    t2[Build the catalog]
  done[Done]
    t3[Ship the scaffold]`,
    },
  },
  {
    id: "stream",
    name: "Stream Graph",
    family: "time",
    synonyms: ["theme river", "stacked stream", "flowing area", "streamgraph"],
    use: "Several series over time as a flowing stacked band, for share and rhythm rather than exact values.",
    echarts: {
      series: "themeRiver",
      docs: echartsDocs("themeRiver"),
      option: ECHARTS_OPTIONS.stream,
      hint: "Data rows are [date, value, series name] on a singleAxis of type time.",
    },
  },
  {
    id: "calendar",
    name: "Calendar Heatmap",
    family: "time",
    synonyms: ["contributions", "github graph", "daily activity", "year view"],
    use: "One cell per day colored by value, for activity and streaks.",
    echarts: {
      series: "heatmap",
      docs: echartsDocs("heatmap"),
      option: ECHARTS_OPTIONS.calendar,
      hint: "A heatmap series on a calendar coordinate system; data rows are [date, value].",
    },
  },

  // Maps
  {
    id: "choropleth",
    name: "Choropleth Map",
    family: "geo",
    synonyms: ["map", "regions", "countries", "shaded map", "geographic"],
    use: "Regions shaded by value on a map.",
    echarts: {
      series: "map",
      docs: echartsDocs("map"),
      option: ECHARTS_OPTIONS.choropleth,
      hint: 'Charter ships a world map as "world"; data names must match its country names.',
    },
  },
  {
    id: "flowmap",
    name: "Flow Map",
    family: "geo",
    synonyms: ["routes", "connections", "origin destination", "lines on a map", "geo lines"],
    use: "Routes drawn between places on a map, for journeys, shipments or traffic.",
    echarts: {
      series: "lines",
      docs: echartsDocs("lines"),
      option: ECHARTS_OPTIONS.flowmap,
      hint: "A lines series on a geo component; coords are [longitude, latitude] pairs.",
    },
  },

  // Frameworks
  {
    id: "quadrant",
    name: "Quadrant",
    family: "framework",
    synonyms: ["2x2", "matrix", "magic quadrant", "prioritization", "effort impact"],
    use: "Items placed on two axes, split into four labeled quadrants.",
    mermaid: {
      keyword: "quadrantChart",
      since: "10.2",
      docs: mermaidDocs("quadrantChart"),
      template: `quadrantChart
  title Reach and engagement
  x-axis Low Reach --> High Reach
  y-axis Low Engagement --> High Engagement
  quadrant-1 Expand
  quadrant-2 Promote
  quadrant-3 Re-evaluate
  quadrant-4 Improve
  Campaign A: [0.3, 0.6]
  Campaign B: [0.8, 0.4]`,
      hint: "Coordinates run 0 to 1 on both axes.",
    },
    echarts: {
      series: "scatter",
      docs: echartsDocs("scatter"),
      option: ECHARTS_OPTIONS.quadrant,
      hint: "A scatter series with markLine at the axis midpoints.",
    },
  },
  {
    id: "venn",
    name: "Venn",
    family: "framework",
    synonyms: ["overlap", "sets", "intersection", "euler"],
    use: "Overlapping sets and what sits in each intersection.",
    mermaid: {
      keyword: "venn-beta",
      since: "11.12.3",
      docs: mermaidDocs("venn"),
      template: `venn-beta
  title What makes a good feature
  set Desirable
  set Feasible
  set Viable
  union Desirable,Feasible["Buildable"]
  union Desirable,Feasible,Viable["Ship it"]`,
    },
  },
  {
    id: "ishikawa",
    name: "Ishikawa",
    family: "framework",
    synonyms: ["fishbone", "cause and effect", "root cause", "5 whys"],
    use: "Causes grouped by category, all pointing at one effect.",
    mermaid: {
      keyword: "ishikawa-beta",
      since: "11.12.3",
      docs: mermaidDocs("ishikawa"),
      template: `ishikawa-beta
    Late deliveries
    Process
        No cut-off time
        Manual picking
    People
        Understaffed on Mondays
    Equipment
        Printer jams`,
      hint: "The first line is the effect; each category and its causes are indented beneath it.",
    },
  },
  {
    id: "wardley",
    name: "Wardley Map",
    family: "framework",
    synonyms: ["value chain", "evolution", "strategy map", "commodity"],
    use: "A value chain plotted against how evolved each component is.",
    mermaid: {
      keyword: "wardley-beta",
      since: "11.14",
      docs: mermaidDocs("wardley"),
      template: `wardley-beta
title Tea shop value chain

anchor Business [0.95, 0.63]
component Cup of Tea [0.79, 0.61]
component Tea [0.63, 0.81]
component Hot Water [0.52, 0.80]
component Kettle [0.43, 0.35]

Business -> Cup of Tea
Cup of Tea -> Tea
Cup of Tea -> Hot Water
Hot Water -> Kettle

evolve Kettle 0.62`,
      hint: "Coordinates are [visibility, evolution], both 0 to 1.",
    },
  },
  {
    id: "cynefin",
    name: "Cynefin",
    family: "framework",
    synonyms: ["sense making", "complexity", "decision framework", "domains"],
    use: "Situations sorted into clear, complicated, complex, chaotic and confusion.",
    mermaid: {
      keyword: "cynefin-beta",
      since: "11.16",
      docs: mermaidDocs("cynefin"),
      template: `cynefin-beta
  title Incident response

  complex
    "Investigate root cause"

  complicated
    "Analyze performance data"

  clear
    "Restart service"

  chaotic
    "Page on-call immediately"

  confusion
    "Unknown failure mode"`,
    },
  },
  {
    id: "usecase",
    name: "Use Case",
    family: "framework",
    synonyms: ["uml use case", "actors", "system boundary", "requirements"],
    use: "Actors and the things the system lets them do.",
    mermaid: {
      keyword: "usecase-beta",
      since: "12.0",
      docs: mermaidDocs("usecase"),
      template: `usecase-beta
direction LR
actor Customer("Customer")
systemBoundary "Order system"
  Checkout("Place order")
  Track("Track order")
end
Customer --> Checkout
Customer --> Track`,
    },
  },
];
