import { Color } from '@raycast/api'

export function getSourceTypeIcon(sourceItemType?: string) {
  if (sourceItemType == null) {
    return '🌐'
  }

  if (sourceItemType === 'hs') {
    return { source: 'icon-prod.png' }
  } else if (sourceItemType === 'Lua') {
    return { source: 'icon-lua.png', tintColor: Color.SecondaryText }
  } else {
    return '🥄'
  }
}

export function getDocumentationTypeIcon(documentationItemType?: string) {
  // the icons were taken from vscode icons and carbon design system icons
  // https://github.com/microsoft/vscode-icons/tree/main/icons/dark
  // https://github.com/carbon-design-system/carbon/blob/main/packages/icons/src/svg/32
  // we just converted them to 64x64 png with
  // https://cloudconvert.com/svg-to-png
  if (documentationItemType === 'Module') {
    return { source: 'symbol-namespace.png', tintColor: Color.SecondaryText }
  } else if (documentationItemType === 'Variable') {
    return { source: 'symbol-variable.png', tintColor: Color.Blue }
  } else if (documentationItemType === 'Field') {
    return { source: 'symbol-field.png', tintColor: Color.Blue }
  } else if (documentationItemType === 'Constant') {
    return { source: 'symbol-constant.png', tintColor: Color.Blue }
  } else if (documentationItemType === 'Constructor') {
    return { source: 'symbol-interface.png', tintColor: Color.Orange }
  } else if (documentationItemType === 'Method') {
    return { source: 'function.png', tintColor: Color.Magenta }
  } else if (documentationItemType === 'Function') {
    return { source: 'function-math.png', tintColor: Color.Magenta }
  } else if (documentationItemType === 'Deprecated') {
    return { source: 'warning.png', tintColor: Color.Yellow }
  } else if (documentationItemType === 'builtin') {
    return { source: 'symbol-misc.png', tintColor: Color.Magenta }
  } else if (documentationItemType === 'c-api') {
    return { source: 'fragments.png', tintColor: Color.Orange }
  } else if (documentationItemType === 'manual') {
    return { source: 'book.png', tintColor: Color.SecondaryText }
  }

  return { source: 'symbol-keyword.png', tintColor: Color.SecondaryText }
}
