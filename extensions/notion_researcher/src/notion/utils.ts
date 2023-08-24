type SplitResult = { type: "text"; text: { content: string } } | { type: "equation"; equation: { expression: string } };

export function splitTextAndEquations(inputString: string): SplitResult[] {
  return inputString.split(/($[^$]*$)/g).reduce((acc: SplitResult[], value: string, index: number) => {
    if (value !== "") {
      if (index % 2 === 0) {
        acc.push({ type: "text", text: { content: value } });
      } else {
        acc.push({ type: "equation", equation: { expression: value.slice(1, -1) } });
      }
    }
    return acc;
  }, []);
}
