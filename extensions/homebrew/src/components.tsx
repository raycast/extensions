import {
  ActionPanel,
  ActionPanelItem,
  CopyToClipboardAction,
  Detail,
  Icon,
  OpenInBrowserAction,
  ShowInFinderAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { brewFormulaPath } from "./brew";

export function FormulaInfo(props: {formula: Formula, isInstalled: bool}) {
  console.log('FormulaInfo:', props.formula.name);

  return <Detail markdown={formatInfo(props.formula, props.isInstalled)} />;
}

function formatInfo(formula: Formula, isInstalled: bool): string {
  return `
# ${formula.full_name}
${formula.desc}

[${formula.homepage}](${formula.homepage})

#### License:
 ${formula.license}

${formatVersions(formula)}

${formatDependencies(formula)}
  `;
}

function formatVersions(formula: Formula): string {
  const versions = formula.versions;
  let markdown = `
#### Versions:
Stable: ${versions.stable} ${versions.bottle ? '(bottled)' : ''}

  `;
  if (versions.head) {
    markdown += versions.head;
  }
  return markdown;
}

function formatDependencies(formula: Formula): string {
  let markdown = '';

  if (formula.dependencies.length > 0) {
    markdown += `
Required: ${formula.dependencies.join(', ')}
    `;
  }

  if (formula.build_dependencies.length > 0) {
    markdown += `
Build: ${formula.build_dependencies.join(', ')}
    `;
  }

  if (markdown) {
    return `#### Dependencies
${markdown}
    `;
  } else {
    return '';
  }
}

  // aalib: stable 1.4rc5 (bottled)
  // Portable ASCII art graphics library
  // https://aa-project.sourceforge.io/aalib/
  // /usr/local/Cellar/aalib/1.4rc5_2 (83 files, 791.9KB) *
  // Poured from bottle on 2021-10-20 at 23:10:54
  // From: https://github.com/Homebrew/homebrew-core/blob/HEAD/Formula/aalib.rb
  // License: GPL-2.0-or-later
