import { vi } from 'vitest'
import * as React from 'react'

export const showToast = vi.fn()
export const Toast = {
  Style: {
    Success: 'success',
    Failure: 'failure'
  }
}

export const Clipboard = {
  copy: vi.fn()
}

export const Icon = {
  Eye: 'eye-icon',
  Clipboard: 'clipboard-icon',
  Key: 'key-icon'
}

// Create proper React component mocks
export const List = vi.fn(({ children, isLoading, searchBarPlaceholder, navigationTitle, onSearchTextChange }) => {
  // Create a div that we can test against
  return React.createElement('div', {
    'data-testid': 'list',
    'data-loading': isLoading,
    'data-searchbar': searchBarPlaceholder,
    'data-title': navigationTitle,
    // Call the search handler when we need to test it
    'data-onsearchtextchange': onSearchTextChange
  }, children)
})

List.EmptyView = vi.fn(({ title, description, icon }) => {
  return React.createElement('div', {
    'data-testid': 'empty-view',
    'data-title': title,
    'data-description': description,
    'data-icon': icon
  })
})

List.Item = vi.fn(({ title, subtitle, keywords, accessories, actions, ...props }) => {
  return React.createElement('div', {
    'data-testid': 'list-item',
    'data-title': title,
    'data-subtitle': subtitle,
    'data-keywords': JSON.stringify(keywords),
    'data-accessories': JSON.stringify(accessories),
    ...props
  }, actions)
})

export const ActionPanel = vi.fn(({ children }) => {
  return React.createElement('div', { 'data-testid': 'action-panel' }, children)
})

export const Action = vi.fn(({ title, icon, onAction }) => {
  return React.createElement('button', {
    'data-testid': 'action',
    'data-title': title,
    'data-icon': icon,
    onClick: onAction
  }, title)
})