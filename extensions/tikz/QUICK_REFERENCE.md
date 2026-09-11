# TikZ Quick Reference

A quick reference guide for generating TikZ diagrams with Raycast.

## Getting Started

### AI Chat Commands
Simply ask the AI to create diagrams:
- "Draw a circle with a node in the center"
- "Create a flowchart with 4 steps"
- "Generate a graph with 5 nodes"
- "Make a binary tree diagram"

### Manual Creation
1. Open Raycast → "Create TikZ"
2. Paste TikZ code
3. Enter optional filename
4. Submit to generate PDF

## Common Patterns

### Drawing Shapes

**Circle:**
```
\draw (0,0) circle (1cm);
```

**Rectangle:**
```
\draw (0,0) rectangle (2,1);
```

**Line:**
```
\draw (0,0) -- (2,1);
```

**Filled Shape:**
```
\draw[fill=blue!20] (0,0) circle (1cm);
```

### Adding Text

**Node:**
```
\node at (0,0) {Text};
```

**Node with Style:**
```
\node[rectangle,draw] at (0,0) {Box};
```

**Text on Path:**
```
\draw (0,0) -- node[above] {Label} (2,0);
```

### Styling

**Colors:**
```
\draw[red] (0,0) -- (1,1);
\draw[blue!50] (0,0) circle (1cm);
```

**Line Styles:**
```
\draw[thick] (0,0) -- (1,1);
\draw[dashed] (0,0) -- (1,1);
\draw[dotted] (0,0) -- (1,1);
```

**Arrows:**
```
\draw[->] (0,0) -- (1,1);
\draw[<->] (0,0) -- (1,1);
\draw[-latex] (0,0) -- (1,1);
```

### Nodes

**Basic Node:**
```
\node[circle,draw] (a) at (0,0) {A};
```

**Node Shapes:**
```
\node[circle,draw] (a) at (0,0) {Circle};
\node[rectangle,draw] (b) at (2,0) {Box};
\node[diamond,draw] (c) at (4,0) {Diamond};
```

**Connecting Nodes:**
```
\node[circle,draw] (a) at (0,0) {A};
\node[circle,draw] (b) at (2,0) {B};
\draw[->] (a) -- (b);
```

### Positioning

**Absolute Coordinates:**
```
\node at (1,2) {Here};
```

**Relative Positioning:**
```
\node[circle,draw] (a) {A};
\node[circle,draw,right=of a] (b) {B};
\node[circle,draw,below=of a] (c) {C};
```

**Calculate Positions:**
```
\node (a) at (0,0) {A};
\node (b) at ($(a)+(2,1)$) {B};
```

## Quick Templates

### Simple Flowchart
```
\node[rectangle,draw] (s) at (0,0) {Start};
\node[rectangle,draw] (p) at (0,-2) {Process};
\node[rectangle,draw] (e) at (0,-4) {End};
\draw[->] (s) -- (p);
\draw[->] (p) -- (e);
```

### Graph with Nodes
```
\node[circle,draw] (a) at (0,0) {A};
\node[circle,draw] (b) at (2,0) {B};
\node[circle,draw] (c) at (1,2) {C};
\draw (a) -- (b) -- (c) -- (a);
```

### Coordinate System
```
\draw[->] (-2,0) -- (2,0) node[right] {$x$};
\draw[->] (0,-2) -- (0,2) node[above] {$y$};
```

### Plot Function
```
\draw[->] (0,0) -- (5,0) node[right] {$x$};
\draw[->] (0,0) -- (0,4) node[above] {$y$};
\draw[domain=0:4,smooth,variable=\x,blue] plot ({\x},{\x*\x/4});
```

### Tree Structure
```
\node[circle,draw] (r) at (0,0) {Root};
\node[circle,draw] (l) at (-1,-1.5) {L};
\node[circle,draw] (rt) at (1,-1.5) {R};
\draw (r) -- (l);
\draw (r) -- (rt);
```

### State Machine
```
\node[circle,draw] (s1) at (0,0) {$S_1$};
\node[circle,draw,double] (s2) at (3,0) {$S_2$};
\draw[->,bend left] (s1) to node[above] {a} (s2);
\draw[->,bend left] (s2) to node[below] {b} (s1);
```

## Color Reference

**Basic Colors:**
- `red`, `blue`, `green`, `yellow`, `orange`, `purple`, `pink`, `brown`, `gray`, `black`, `white`

**Color Mixing:**
- `red!50` (50% red)
- `red!50!blue` (mix red and blue)
- `blue!20` (20% blue, 80% white)

## Common Options

**Node Options:**
- `draw` - Draw border
- `fill=color` - Fill with color
- `circle` - Circle shape
- `rectangle` - Rectangle shape
- `diamond` - Diamond shape
- `minimum size=1cm` - Set size
- `inner sep=5pt` - Padding

**Path Options:**
- `thick` - Thick line
- `thin` - Thin line
- `dashed` - Dashed line
- `dotted` - Dotted line
- `->` - Arrow
- `<->` - Double arrow
- `bend left` - Curve left
- `bend right` - Curve right

**Text Options:**
- `above` - Place above
- `below` - Place below
- `left` - Place left
- `right` - Place right
- `rotate=45` - Rotate text

## Tips & Tricks

1. **Always test simple first** - Start with basic shapes, then add complexity
2. **Use coordinates wisely** - Name nodes for easier connections
3. **Layer your drawing** - Background first, then connections, then labels
4. **Comment your code** - Use `%` for comments in TikZ
5. **Check examples** - See `examples/tikz-examples.md` for more

## Common Mistakes

❌ **Missing semicolon:**
```
\draw (0,0) -- (1,1)  % Missing ;
```

✅ **Correct:**
```
\draw (0,0) -- (1,1);
```

❌ **Wrong coordinate format:**
```
\node at 0,0 {Text};  % Missing parentheses
```

✅ **Correct:**
```
\node at (0,0) {Text};
```

❌ **Unescaped special characters:**
```
\node {Use & symbol};  % & is special in LaTeX
```

✅ **Correct:**
```
\node {Use \& symbol};
```

## Keyboard Shortcuts (in Form)

- **⌘ + Enter** - Submit form
- **⌘ + K** - Open action panel
- **Tab** - Next field
- **Shift + Tab** - Previous field

## File Locations

- **AI Generated:** `~/Library/Application Support/com.raycast.macos/extensions/tikz/tikz-diagrams/`
- **Manual Created:** `~/Documents/TikZ-Diagrams/`

## Need Help?

- See full examples: `examples/tikz-examples.md`
- Read documentation: `README.md`
- Development guide: `DEVELOPMENT.md`
- Online resources: [tikz.dev](https://tikz.dev/)