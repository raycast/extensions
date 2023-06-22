// This file is dev-time
// It determines the order of processors based on their dependencies at dev-time
// So that resources can be saved at run-time
import { ProcessorRecord } from './createOrderedProcessor';

export function findProcessorOrder(processors: ProcessorRecord[]) {
  const dependencyMap = processors.reduce((acc, [name, , dependencies]) => {
    if (!dependencies) return acc;
    if (dependencies.some((dependency) => processors.every(([n]) => n !== dependency)))
      throw new Error(`Processor ${name} is not defined`);
    if (acc[name]) throw new Error(`Processor ${name} is defined more than once`);
    acc[name] = dependencies;
    return acc;
  }, {} as Record<string, string[]>);

  // Check for loops
  const traverse = (name: string, stack: string[] = []) => {
    if (stack.includes(name)) throw new Error(`Processor ${name} depends on itself`);
    const nextStack = stack.concat(name);
    dependencyMap[name]?.forEach((dependency) => traverse(dependency, nextStack));
  };
  Object.keys(dependencyMap).forEach((name) => traverse(name));

  // turn dependencyMap into an array of string safely
  // if a processor depends on another processor, it should appear after the other processor
  const dependencyOrder: string[] = processors.map(([name]) => name);
  const runSort = () =>
    dependencyOrder.slice().sort((a, b) => {
      const dependenciesA = dependencyMap[a];
      const dependenciesB = dependencyMap[b];
      if (!dependenciesA && !dependenciesB) return 0;
      if (!dependenciesA) return -1;
      if (!dependenciesB) return 1;
      if (dependenciesA.includes(b)) return 1;
      if (dependenciesB.includes(a)) return -1;
      return 0;
    });

  let lastOrder = dependencyOrder;
  let i = 1000;
  while (i) {
    const nextOrder = runSort();
    if (nextOrder.join() === lastOrder.join()) break;
    lastOrder = nextOrder;
    i--;
  }

  if (i === 0) throw new Error('Failed to find processor order');

  return lastOrder;
}
