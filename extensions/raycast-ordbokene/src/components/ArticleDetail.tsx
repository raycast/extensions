import { List } from "@raycast/api";
import { ArticleResponse } from "../types";

interface ArticleDetailProps {
  articles: {
    bm?: ArticleResponse[];
    nn?: ArticleResponse[];
  };
  isLoading: boolean;
}

export function ArticleDetail({ articles, isLoading }: ArticleDetailProps) {
  if (isLoading) {
    return <List.Item.Detail isLoading={true} />;
  }

  const formatDefinitions = (article: ArticleResponse) => {
    type DefinitionElement = {
      type_: string;
      content?: string;
      elements?: DefinitionElement[];
      items?: Array<{
        type_: string;
        id?: string;
        text?: string;
        article_id?: number;
        lemmas?: Array<{
          type_: string;
          hgno: number;
          id: number;
          lemma: string;
        }>;
        definition_id?: number | null;
        definition_order?: number;
      }>;
      quote?: {
        content: string;
        items?: Array<{
          type_: string;
          text?: string;
        }>;
      };
      explanation?: {
        content: string;
        items: unknown[];
      };
    };

    const formatDefinitionElements = (elements: DefinitionElement[]): string => {
      let explanation = "";
      const examples: string[] = [];
      let explContent: string;
      let exampleContent: string;
      let nested: string;

      elements.forEach((el) => {
        switch (el.type_) {
          case "definition":
            if (el.elements) {
              nested = formatDefinitionElements(el.elements);
              if (nested) explanation += (explanation ? "\n" : "") + nested;
            }
            break;

          case "explanation":
            explContent =
              el.content?.replace(/\$\s?/g, (match) => {
                if (!el.items?.[0]) return match;
                const item = el.items[0];
                switch (item.type_) {
                  case "usage":
                    return item.text || "";
                  case "article_ref":
                    return item.lemmas?.[0]?.lemma || "";
                  case "entity":
                    if (item.id === "el") return "eller ";
                    return "";
                  default:
                    return "";
                }
              }) || "";
            if (explContent) explanation += (explanation ? "; " : "") + explContent.trim();
            break;

          case "example":
            if (el.quote) {
              exampleContent = el.quote.content.replace(
                /\$/g,
                el.quote.items?.map((item) => item.text).join(" ") || ""
              );
              examples.push(exampleContent);
            }
            break;
        }
      });

      let result = explanation;
      if (examples.length > 0) {
        result += "\n\nEksempel\n\n" + examples.map((ex) => `  - ${ex}`).join("\n");
      }

      return result;
    };

    let definitionNumber = 1;
    return article.body.definitions
      .map((def) => {
        const definitionContent = def.elements
          .map((el) => {
            if (el.type_ === "definition" && el.elements) {
              return `## Definisjon ${definitionNumber++}\n${formatDefinitionElements(el.elements)}`;
            }
            return formatDefinitionElements([el]);
          })
          .join("\n\n");

        return definitionContent;
      })
      .join("\n\n");
  };

  const formatEtymology = (article: ArticleResponse) => {
    type EtymologyItem = {
      type_: string;
      id?: string;
      text?: string;
      article_id?: number;
      lemmas?: Array<{
        type_: string;
        hgno: number;
        id: number;
        lemma: string;
      }>;
    };

    type EtymologyEntry = {
      type_: string;
      content: string;
      items: EtymologyItem[];
    };

    if (!article.body.etymology?.length) return "";

    const etymology = article.body.etymology
      .map((etym: EtymologyEntry) => {
        const replacedContent = etym.content.replace(/\$\s?/g, (match) => {
          if (!etym.items?.[0]) return match;
          const item = etym.items[0];
          switch (item.type_) {
            case "language":
              return item.id || "";
            case "usage":
              return item.text || "";
            case "entity":
              return item.id || "";
            case "article_ref":
              return item.lemmas?.[0]?.lemma || "";
            default:
              return "";
          }
        });

        return replacedContent;
      })
      .filter(Boolean)
      .join(" ");

    return etymology ? `## Opphav\n${etymology}` : "";
  };

  const formatInflections = (article: ArticleResponse) => {
    if (!article.lemmas?.[0]?.paradigm_info?.[0]?.inflection) return "";

    const inflections = article.lemmas[0].paradigm_info[0].inflection
      .filter((inf) => inf.word_form)
      .map((inf) => `- ${inf.tags.join(", ")}: ${inf.word_form}`)
      .join("\n");

    return inflections ? `## Bøyning\n${inflections}` : "";
  };

  const formatArticle = (article: ArticleResponse, title: string) => `
# ${title}
${article.lemmas[0]?.lemma || ""}
${article.lemmas[0]?.inflection_class ? `_(${article.lemmas[0].inflection_class})_\n` : ""}

${formatDefinitions(article)}

${formatInflections(article)}

${formatEtymology(article)}
`;

  const markdown = [
    ...(() => {
      const bmArticles = articles.bm;
      return bmArticles && Array.isArray(bmArticles)
        ? bmArticles.map((article, index) => formatArticle(article, `Bokmål ${bmArticles.length > 1 ? index + 1 : ""}`))
        : [];
    })(),
    ...(() => {
      const nnArticles = articles.nn;
      return nnArticles && Array.isArray(nnArticles)
        ? nnArticles.map((article, index) =>
            formatArticle(article, `Nynorsk ${nnArticles.length > 1 ? index + 1 : ""}`)
          )
        : [];
    })(),
  ]
    .filter(Boolean)
    .join("\n---\n");

  return <List.Item.Detail markdown={markdown} />;
}
