# TikZ Examples

A collection of ready-to-use TikZ code examples for creating various diagrams.

## Basic Shapes

### Circle
```
\draw[fill=blue!20] (0,0) circle (1.5cm);
\node at (0,0) {Circle};
```

### Rectangle
```
\draw[fill=red!20] (0,0) rectangle (3,2);
\node at (1.5,1) {Rectangle};
```

### Triangle
```
\draw[fill=green!20] (0,0) -- (2,0) -- (1,2) -- cycle;
\node at (1,0.5) {Triangle};
```

### Multiple Shapes
```
\draw[fill=blue!20] (0,0) rectangle (2,2);
\draw[fill=red!20] (3,0) circle (1);
\draw[fill=green!20] (6,0) -- (7,0) -- (6.5,1.5) -- cycle;
\draw[fill=yellow!20] (0,3) ellipse (1.5cm and 1cm);
```

## Flowcharts

### Simple Process Flow
```
\node[rectangle,draw,rounded corners] (start) at (0,0) {Start};
\node[rectangle,draw] (process1) at (0,-2) {Process 1};
\node[rectangle,draw] (process2) at (0,-4) {Process 2};
\node[rectangle,draw,rounded corners] (end) at (0,-6) {End};
\draw[->,thick] (start) -- (process1);
\draw[->,thick] (process1) -- (process2);
\draw[->,thick] (process2) -- (end);
```

### Decision Flow
```
\node[rectangle,draw,rounded corners] (start) at (0,0) {Start};
\node[rectangle,draw] (input) at (0,-1.5) {Get Input};
\node[diamond,draw,aspect=2,inner sep=0pt] (decision) at (0,-3.5) {Valid?};
\node[rectangle,draw] (process) at (0,-5.5) {Process};
\node[rectangle,draw] (error) at (3,-3.5) {Show Error};
\node[rectangle,draw,rounded corners] (end) at (0,-7) {End};
\draw[->,thick] (start) -- (input);
\draw[->,thick] (input) -- (decision);
\draw[->,thick] (decision) -- node[right] {Yes} (process);
\draw[->,thick] (decision) -- node[above] {No} (error);
\draw[->,thick] (process) -- (end);
\draw[->,thick] (error) |- (input);
```

## Graphs and Plots

### Coordinate System
```
\draw[->] (-3,0) -- (3,0) node[right] {$x$};
\draw[->] (0,-2) -- (0,2) node[above] {$y$};
\foreach \x in {-2,-1,1,2}
  \draw (\x,0.1) -- (\x,-0.1) node[below] {\x};
\foreach \y in {-1,1}
  \draw (0.1,\y) -- (-0.1,\y) node[left] {\y};
```

### Sine Wave
```
\draw[->] (-0.5,0) -- (7,0) node[right] {$x$};
\draw[->] (0,-1.5) -- (0,1.5) node[above] {$y$};
\draw[domain=0:6.28,smooth,variable=\x,blue,thick] plot ({\x},{sin(\x r)});
\node[blue] at (3,1.2) {$y = \sin(x)$};
```

### Quadratic Function
```
\draw[->] (-1,0) -- (5,0) node[right] {$x$};
\draw[->] (0,-1) -- (0,5) node[above] {$y$};
\draw[domain=0:3,smooth,variable=\x,red,thick] plot ({\x},{\x*\x});
\node[red] at (2,4.5) {$y = x^2$};
```

### Bar Chart
```
\draw[->] (0,0) -- (6,0) node[right] {Category};
\draw[->] (0,0) -- (0,5) node[above] {Value};
\draw[fill=blue!50] (0.5,0) rectangle (1.5,3);
\draw[fill=red!50] (2,0) rectangle (3,4.5);
\draw[fill=green!50] (3.5,0) rectangle (4.5,2.5);
\draw[fill=yellow!50] (5,0) rectangle (6,3.8);
\node at (1,-0.3) {A};
\node at (2.5,-0.3) {B};
\node at (4,-0.3) {C};
\node at (5.5,-0.3) {D};
```

## Trees and Hierarchies

### Binary Tree
```
\node[circle,draw] (root) at (0,0) {1};
\node[circle,draw] (left) at (-2,-1.5) {2};
\node[circle,draw] (right) at (2,-1.5) {3};
\node[circle,draw] (ll) at (-3,-3) {4};
\node[circle,draw] (lr) at (-1,-3) {5};
\node[circle,draw] (rl) at (1,-3) {6};
\node[circle,draw] (rr) at (3,-3) {7};
\draw (root) -- (left);
\draw (root) -- (right);
\draw (left) -- (ll);
\draw (left) -- (lr);
\draw (right) -- (rl);
\draw (right) -- (rr);
```

### Organization Chart
```
\node[rectangle,draw] (ceo) at (0,0) {CEO};
\node[rectangle,draw] (cto) at (-3,-2) {CTO};
\node[rectangle,draw] (cfo) at (0,-2) {CFO};
\node[rectangle,draw] (cmo) at (3,-2) {CMO};
\node[rectangle,draw] (dev1) at (-4,-4) {Dev 1};
\node[rectangle,draw] (dev2) at (-2,-4) {Dev 2};
\node[rectangle,draw] (acc) at (0,-4) {Accountant};
\node[rectangle,draw] (mark) at (3,-4) {Marketer};
\draw (ceo) -- (cto);
\draw (ceo) -- (cfo);
\draw (ceo) -- (cmo);
\draw (cto) -- (dev1);
\draw (cto) -- (dev2);
\draw (cfo) -- (acc);
\draw (cmo) -- (mark);
```

## Networks and Graphs

### Simple Graph
```
\node[circle,draw] (a) at (0,0) {A};
\node[circle,draw] (b) at (2,1) {B};
\node[circle,draw] (c) at (2,-1) {C};
\node[circle,draw] (d) at (4,0) {D};
\draw[thick] (a) -- (b);
\draw[thick] (a) -- (c);
\draw[thick] (b) -- (d);
\draw[thick] (c) -- (d);
\draw[thick] (b) -- (c);
```

### Directed Graph
```
\node[circle,draw] (1) at (0,0) {1};
\node[circle,draw] (2) at (2,1) {2};
\node[circle,draw] (3) at (2,-1) {3};
\node[circle,draw] (4) at (4,0) {4};
\draw[->,thick] (1) -- (2);
\draw[->,thick] (1) -- (3);
\draw[->,thick] (2) -- (4);
\draw[->,thick] (3) -- (4);
\draw[->,thick,bend left] (2) to (3);
\draw[->,thick,bend left] (3) to (2);
```

### Weighted Graph
```
\node[circle,draw] (a) at (0,0) {A};
\node[circle,draw] (b) at (3,0) {B};
\node[circle,draw] (c) at (1.5,2) {C};
\draw[thick] (a) -- node[below] {5} (b);
\draw[thick] (a) -- node[left] {3} (c);
\draw[thick] (b) -- node[right] {7} (c);
```

## State Machines

### Simple State Machine
```
\node[circle,draw,thick] (s0) at (0,0) {$S_0$};
\node[circle,draw,double,thick] (s1) at (3,0) {$S_1$};
\node[circle,draw,thick] (s2) at (1.5,2) {$S_2$};
\draw[->,thick] (-1.5,0) -- (s0);
\draw[->,thick,bend left] (s0) to node[below] {a} (s1);
\draw[->,thick,bend left] (s1) to node[above] {b} (s0);
\draw[->,thick] (s0) to node[left] {c} (s2);
\draw[->,thick] (s2) to node[right] {d} (s1);
\draw[->,thick] (s2) edge[loop above] node {e} (s2);
```

## Diagrams

### Venn Diagram
```
\draw[fill=blue!30,opacity=0.5] (0,0) circle (1.5);
\draw[fill=red!30,opacity=0.5] (2,0) circle (1.5);
\node at (-0.7,0) {A};
\node at (2.7,0) {B};
\node at (1,0) {$A \cap B$};
\draw (-2.5,-2.5) rectangle (4.5,2.5);
\node at (3.5,2) {U};
```

### Timeline
```
\draw[thick,->] (0,0) -- (10,0);
\foreach \x/\year in {1/2020,3/2021,5/2022,7/2023,9/2024} {
  \draw[thick] (\x,0.2) -- (\x,-0.2);
  \node[below] at (\x,-0.3) {\year};
}
\node[above] at (1,0.3) {Event 1};
\node[above] at (3,0.3) {Event 2};
\node[above] at (5,0.3) {Event 3};
\node[above] at (7,0.3) {Event 4};
\node[above] at (9,0.3) {Event 5};
```

### Mind Map
```
\node[circle,draw,fill=yellow!30] (center) at (0,0) {Topic};
\node[circle,draw,fill=blue!20] (a) at (-3,2) {Idea 1};
\node[circle,draw,fill=blue!20] (b) at (3,2) {Idea 2};
\node[circle,draw,fill=blue!20] (c) at (-3,-2) {Idea 3};
\node[circle,draw,fill=blue!20] (d) at (3,-2) {Idea 4};
\node[rectangle,draw,fill=green!20] (a1) at (-4.5,3) {Sub 1.1};
\node[rectangle,draw,fill=green!20] (a2) at (-4.5,1) {Sub 1.2};
\draw[thick] (center) -- (a);
\draw[thick] (center) -- (b);
\draw[thick] (center) -- (c);
\draw[thick] (center) -- (d);
\draw (a) -- (a1);
\draw (a) -- (a2);
```

## Mathematical Diagrams

### Geometry - Triangle with Angles
```
\draw[thick] (0,0) -- (4,0) -- (2,3) -- cycle;
\node at (2,-0.3) {$a$};
\node at (0.8,1.7) {$b$};
\node at (3.2,1.7) {$c$};
\draw (0.5,0) arc (0:56:0.5);
\node at (0.8,0.3) {$\alpha$};
\draw (3.5,0) arc (180:124:0.5);
\node at (3.2,0.3) {$\beta$};
\draw (2,2.5) arc (270:200:0.5);
\node at (2,2.2) {$\gamma$};
```

### Coordinate Transformation
```
\draw[->] (0,0) -- (3,0) node[right] {$x$};
\draw[->] (0,0) -- (0,3) node[above] {$y$};
\draw[->,red] (0,0) -- (2,2) node[above right] {$x'$};
\draw[->,red] (0,0) -- (-1,1) node[above left] {$y'$};
\draw[thick,blue] (1,0) -- (1,1) -- (0,1);
\draw[thick,green] (1.5,1.5) -- (0.5,2.5) -- (0,2);
\node at (4,1.5) {Rotation};
```

### Vector Addition
```
\draw[->] (0,0) -- (3,0) node[right] {$x$};
\draw[->] (0,0) -- (0,3) node[above] {$y$};
\draw[->,thick,blue] (0,0) -- (2,1) node[midway,below] {$\vec{a}$};
\draw[->,thick,red] (2,1) -- (3,2.5) node[midway,right] {$\vec{b}$};
\draw[->,thick,green,dashed] (0,0) -- (3,2.5) node[midway,left] {$\vec{a}+\vec{b}$};
```

## 3D-like Diagrams

### Cube
```
\draw[thick] (0,0) -- (2,0) -- (2,2) -- (0,2) -- cycle;
\draw[thick] (0.5,0.5) -- (2.5,0.5) -- (2.5,2.5) -- (0.5,2.5) -- cycle;
\draw[thick] (0,0) -- (0.5,0.5);
\draw[thick] (2,0) -- (2.5,0.5);
\draw[thick] (2,2) -- (2.5,2.5);
\draw[thick] (0,2) -- (0.5,2.5);
```

### Cylinder
```
\draw[thick] (0,0) ellipse (1 and 0.3);
\draw[thick] (-1,0) -- (-1,-3);
\draw[thick] (1,0) -- (1,-3);
\draw[thick] (0,-3) ellipse (1 and 0.3);
```

## Circuit Diagrams

### Simple Circuit
```
\draw[thick] (0,0) -- (0,2) -- (2,2);
\draw[thick] (2,2) -- (4,2) -- (4,0) -- (0,0);
\draw[thick,fill=white] (1.5,2) circle (0.3);
\node at (1.5,2) {R};
\draw[thick] (2,1.5) -- (2,0.5);
\draw[thick] (2.5,1.5) -- (1.5,1.5);
\draw[thick] (2.5,0.5) -- (1.5,0.5);
\draw[thick] (2.3,0.7) -- (2.3,0.5);
\draw[thick] (2.3,0.7) -- (2.1,0.7);
\node at (0.5,1) {+};
\node at (0.5,0.5) {-};
```
