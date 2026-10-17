interface CheerioSelection {
  each(callback: (index: number, element: Element) => void): CheerioSelection;
  remove(): CheerioSelection;
  attr(name: string, value?: string): string | undefined | CheerioSelection;
  eq(index: number): CheerioSelection;
  find(selector: string): CheerioSelection;
  first(): CheerioSelection;
  length: number;
  html(): string | null;
  text(): string;
  [index: number]: Element;
}

interface CheerioStatic {
  (selector: string | Element): CheerioSelection;
  html(): string;
}

export function load(content: string, options?: { xmlMode?: boolean }): CheerioStatic {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, options?.xmlMode ? "text/xml" : "text/html");

  const $ = ((selector: string | Element): CheerioSelection => {
    let elements: Element[] = [];

    if (typeof selector === "string") {
      elements = Array.from(doc.querySelectorAll(selector));
    } else {
      elements = [selector];
    }

    const selection: CheerioSelection = {
      each(callback: (index: number, element: Element) => void): CheerioSelection {
        elements.forEach((element, index) => {
          callback(index, element);
        });
        return selection;
      },
      remove(): CheerioSelection {
        elements.forEach((element) => element.remove());
        return selection;
      },
      attr(name: string, value?: string): string | CheerioSelection {
        if (value === undefined) {
          // Not casting would violate Cheerio's API contract, which returns an empty string
          // "" for attributes that exist but are empty (e.g., <input disabled>),
          // and undefined only when the attribute doesn't exist.
          return elements[0]?.getAttribute(name) as string;
        } else {
          elements.forEach((element) => element.setAttribute(name, value));
          return selection;
        }
      },
      eq(index: number): CheerioSelection {
        const element = elements[index];
        if (element) {
          return $(element);
        }
        return $("[data-cheerio-not-found]");
      },
      find(selector: string): CheerioSelection {
        const foundElements: Element[] = [];
        elements.forEach((element) => {
          foundElements.push(...Array.from(element.querySelectorAll(selector)));
        });
        return $(foundElements.length > 0 ? foundElements[0] : "[data-cheerio-not-found]") as CheerioSelection;
      },
      first(): CheerioSelection {
        return elements.length > 0 ? $(elements[0]) : $("[data-cheerio-not-found]");
      },
      get length() {
        return elements.length;
      },
      html(): string | null {
        return elements[0]?.innerHTML || null;
      },
      text(): string {
        return elements[0]?.textContent || "";
      },
    };

    elements.forEach((element, index) => {
      selection[index] = element;
    });

    return selection;
  }) as CheerioStatic;

  $.html = () => doc.documentElement.outerHTML;

  return $;
}
