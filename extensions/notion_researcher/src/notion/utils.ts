import {} from "@notionhq/client";

export function splitTextAndEquations(inputString: string): any[] {
  return inputString.split(/(\$[^\$]*\$)/g).reduce((acc: any[], value: string, index: number) => {
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

("https://api.semanticscholar.org/graph/v1/paper/649def34f8be52c8b66281af98ae884c09aef38b/references?fields=contexts,intents,openAccessPdf,citationCount,abstract,url,publicationDate,authors,journal,title,isInfluential,abstract&offset=200&limit=10");
