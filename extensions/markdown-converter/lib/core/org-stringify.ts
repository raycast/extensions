/**
 * Org-mode serializer for mdast AST.
 * Converts parsed Markdown AST to Org-mode syntax.
 */

import type { Node, Parent } from 'mdast';

/**
 * Context for serialization, tracking nesting levels.
 */
interface Context {
  depth: number;
  listDepth?: number;
  ordered?: boolean;
  listIndex?: number;
}

/**
 * Converts an mdast AST to Org-mode syntax.
 * @param tree - The mdast Root node
 * @returns Org-mode formatted text
 */
export function toOrg(tree: Node): string {
  if (!('children' in tree)) {
    return '';
  }
  return serializeChildren((tree as Parent).children, { depth: 0 }).trim() + '\n';
}

function serializeChildren(nodes: Node[], ctx: Context): string {
  return nodes.map(n => serializeNode(n, ctx)).join('');
}

function serializeNode(node: Node, ctx: Context): string {
  switch (node.type) {
    // Block elements
    case 'heading': {
      const heading = node as import('mdast').Heading;
      const stars = '*'.repeat(heading.depth);
      const content = serializeChildren(heading.children, ctx);
      return `${stars} ${content}\n`;
    }

    case 'paragraph': {
      const para = node as import('mdast').Paragraph;
      const content = serializeChildren(para.children, ctx);
      return content + '\n\n';
    }

    case 'blockquote': {
      const quote = node as import('mdast').Blockquote;
      const content = serializeChildren(quote.children, ctx).trim();
      return `#+BEGIN_QUOTE\n${content}\n#+END_QUOTE\n\n`;
    }

    case 'code': {
      const code = node as import('mdast').Code;
      const lang = code.lang ? ` ${code.lang}` : '';
      return `#+BEGIN_SRC${lang}\n${code.value}\n#+END_SRC\n\n`;
    }

    case 'thematicBreak':
      return '-----\n\n';

    // Lists
    case 'list': {
      const list = node as import('mdast').List;
      const listCtx: Context = {
        ...ctx,
        listDepth: (ctx.listDepth ?? 0) + 1,
        ordered: list.ordered ?? false,
        listIndex: 0,
      };
      return serializeChildren(list.children, listCtx) + '\n';
    }

    case 'listItem': {
      const item = node as import('mdast').ListItem;
      const indent = '  '.repeat((ctx.listDepth ?? 1) - 1);
      const bullet = ctx.ordered ? `${(ctx.listIndex ?? 0) + 1}.` : '-';

      // Increment index for next sibling
      if (ctx.listIndex !== undefined) {
        ctx.listIndex++;
      }

      // Handle nested content (paragraphs, nested lists)
      let content = '';
      for (const child of item.children) {
        if (child.type === 'paragraph') {
          content += serializeChildren((child as import('mdast').Paragraph).children, ctx);
        } else if (child.type === 'list') {
          content += '\n' + serializeNode(child, ctx);
        } else {
          content += serializeNode(child, ctx);
        }
      }

      return `${indent}${bullet} ${content.trim()}\n`;
    }

    // Tables (GFM)
    case 'table': {
      return serializeTable(node as import('mdast').Table, ctx);
    }

    case 'tableRow':
    case 'tableCell':
      // Handled by serializeTable
      return '';

    // Inline elements
    case 'text': {
      const text = node as import('mdast').Text;
      return text.value;
    }

    case 'strong': {
      const strong = node as import('mdast').Strong;
      return `*${serializeChildren(strong.children, ctx)}*`;
    }

    case 'emphasis': {
      const em = node as import('mdast').Emphasis;
      return `/${serializeChildren(em.children, ctx)}/`;
    }

    case 'inlineCode': {
      const code = node as import('mdast').InlineCode;
      return `~${code.value}~`;
    }

    case 'delete': {
      // Strikethrough (GFM)
      const del = node as import('mdast').Delete;
      return `+${serializeChildren(del.children, ctx)}+`;
    }

    case 'link': {
      const link = node as import('mdast').Link;
      const text = serializeChildren(link.children, ctx);
      if (text && text !== link.url) {
        return `[[${link.url}][${text}]]`;
      }
      return `[[${link.url}]]`;
    }

    case 'image': {
      const img = node as import('mdast').Image;
      // In Org-mode, images are displayed with [[url]] (no description)
      // Alt text goes in #+CAPTION: before the image
      // Note: This returns a block-level construct even though image is inline in Markdown
      if (img.alt) {
        return `#+CAPTION: ${img.alt}\n[[${img.url}]]`;
      }
      return `[[${img.url}]]`;
    }

    case 'break':
      return '\\\\\n';

    case 'html': {
      const html = node as import('mdast').Html;
      // Pass through HTML as-is (Org can handle some HTML)
      return `#+BEGIN_EXPORT html\n${html.value}\n#+END_EXPORT\n\n`;
    }

    case 'definition':
      // Link reference definitions don't have Org equivalent, skip
      return '';

    default:
      // Fallback: try to serialize children if they exist
      if ('children' in node && Array.isArray((node as Parent).children)) {
        return serializeChildren((node as Parent).children, ctx);
      }
      // Unknown leaf node
      return '';
  }
}

/**
 * Serialize a GFM table to Org table format.
 */
function serializeTable(node: import('mdast').Table, ctx: Context): string {
  const rows = node.children.map((row) => {
    const cells = row.children.map(cell =>
      serializeChildren(cell.children, ctx).trim()
    );
    return '| ' + cells.join(' | ') + ' |';
  });

  // Insert horizontal separator after header row (first row)
  // Org format: |---+---+---| with dashes matching column widths
  if (rows.length > 0) {
    const headerRow = node.children[0];
    const numCols = headerRow.children.length;
    const separator = '|' + Array(numCols).fill('---').join('+') + '|';
    rows.splice(1, 0, separator);
  }

  return rows.join('\n') + '\n\n';
}
