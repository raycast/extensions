import { DOMParser, parseHTML } from "linkedom";

import { DOMParserAdapter } from "../../../core/adapters/index.js";
import { mdlog } from "../../../core/logging.js";

/**
 * Raycast DOM parser adapter with enhanced HTML parsing.
 * Since jsdom doesn't bundle well in Raycast, we use an enhanced fallback parser.
 */
export class RaycastDOMParserAdapter implements DOMParserAdapter {
  parseFromString(html: string, type: string): Document {
    try {
      // Prefer HTML parsing but support XML when requested (e.g., DOMParser API parity)
      if (type === "text/html" || !type) {
        const normalizedHtml = this.ensureHtmlDocument(html);
        const { document, window } = parseHTML(normalizedHtml);

        if (!document.defaultView && window) {
          // Ensure downstream code can access window globals (Node, NodeFilter, etc.)
          (document as any).defaultView = window;
        }

        return document as unknown as Document;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, type as any);
    return doc as unknown as Document;
    } catch (error) {
      mdlog('error', 'dom-parser', 'linkedom parsing failed', error);
      // Fallback to enhanced parsing
      return this.createEnhancedDocument(html);
    }
  }

  private ensureHtmlDocument(html: string): string {
    if (!html.trim()) {
      return "<html><body></body></html>";
    }

    if (/<html[\s>]/i.test(html)) {
      return html;
    }

    return `<html><body>${html}</body></html>`;
  }

  private createEnhancedDocument(html: string): Document {
    // Create a basic document structure that satisfies our converter's needs
    const createElement = (tagName: string) => {
      const element = {
        tagName: tagName.toUpperCase(),
        nodeType: 1, // ELEMENT_NODE
        nodeName: tagName.toUpperCase(),
        innerHTML: '',
        textContent: '',
        childNodes: [] as any[],
        children: [] as any[],
        attributes: new Map(),
        style: {},
        parentNode: null as any,
        classList: {
          contains: () => false,
          add: () => {},
          remove: () => {}
        },
        appendChild: function(child: any) {
          this.childNodes.push(child);
          if (child.nodeType === 1) this.children.push(child);
          child.parentNode = this;
          return child;
        },
        removeChild: function(child: any) {
          const index = this.childNodes.indexOf(child);
          if (index > -1) this.childNodes.splice(index, 1);
          return child;
        },
        querySelector: () => null,
        querySelectorAll: () => [],
        getAttribute: function(name: string) {
          return this.attributes.get(name) || null;
        },
        setAttribute: function(name: string, value: string) {
          this.attributes.set(name, value);
        },
        replaceWith: function(newElement: any) {
          if (this.parentNode) {
            this.parentNode.replaceChild(newElement, this);
          }
        },
        replaceChild: function(newChild: any, oldChild: any) {
          const index = this.childNodes.indexOf(oldChild);
          if (index > -1) {
            this.childNodes[index] = newChild;
            newChild.parentNode = this;
          }
          return oldChild;
        },
        cloneNode: function(deep: boolean = false) {
          const clone = createElement(this.tagName);
          clone.innerHTML = this.innerHTML;
          clone.textContent = this.textContent;
          if (deep) {
            this.childNodes.forEach((child: any) => {
              clone.appendChild(child.cloneNode ? child.cloneNode(true) : child);
            });
          }
          return clone;
        }
      };
      return element;
    };

    const createTextNode = (text: string) => ({
      nodeType: 3, // TEXT_NODE
      nodeName: '#text',
      textContent: text,
      nodeValue: text,
      parentNode: null
    });

    // Parse HTML into a simple structure
    const body = createElement('body');
    body.innerHTML = html;
    
    // Very basic HTML parsing - just put the HTML in the body
    // This is sufficient for our conversion needs
    if (html.trim()) {
      body.textContent = html.replace(/<[^>]*>/g, ''); // Fallback text content
    }

    const doc = {
      nodeType: 9, // DOCUMENT_NODE
      body: body,
      defaultView: {
        Node: {
          TEXT_NODE: 3,
          ELEMENT_NODE: 1,
          COMMENT_NODE: 8
        },
        NodeFilter: {
          SHOW_ELEMENT: 1,
          SHOW_TEXT: 4
        }
      },
      createElement: createElement,
      createTextNode: createTextNode,
      createTreeWalker: (root: any, whatToShow: number) => {
        let currentNode = root;
        return {
          currentNode: currentNode,
          nextNode: () => {
            // Simple tree walker implementation
            return null;
          }
        };
      },
      querySelector: () => null,
      querySelectorAll: () => []
    } as unknown as Document;

    return doc;
  }
}