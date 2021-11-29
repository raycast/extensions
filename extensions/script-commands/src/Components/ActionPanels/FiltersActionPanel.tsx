import { 
  ActionPanel, 
  Color, 
  Icon 
} from "@raycast/api"

import { 
  useLanguages 
} from "@hooks"

import { 
  Language 
} from "@models"

import { 
  Filter, 
  State 
} from "@types"

import { 
  languageURL 
} from "@urls"

type FiltersActionPanelProps = {
  onFilter: (filter: Filter) => void
}

export function FiltersActionPanel({ onFilter }: FiltersActionPanelProps): JSX.Element {
  const { languages } = useLanguages()

  return (
    <ActionPanel title="Filter by">
      <ActionPanel.Submenu 
        title="Type" 
        icon={{ source: Icon.Terminal }}
        shortcut={{ 
          modifiers: ["cmd"], 
          key: "t" 
        }}
      >
        <ActionPanel.Item 
          title="Installed"
          icon={{ 
            source: Icon.Checkmark, 
            tintColor: Color.Green
          }}
          onAction={ () => onFilter(State.Installed) }
        />
        <ActionPanel.Item 
          title="Need Setup"
          icon={{ 
            source: Icon.Gear, 
            tintColor: Color.Orange
          }}
          onAction={ () => onFilter(State.NeedSetup) }
        />
      </ActionPanel.Submenu>
      <ActionPanel.Submenu 
        title="Languages"
        icon={{ source: Icon.Hammer }}
        shortcut={{ 
          modifiers: ["cmd"], 
          key: "l" 
        }}
        children={languages.map(language => (
          <LanguageActionItem 
            key={ language.name }
            language={ language }
            onFilter={ onFilter }
          />
        ))}
      />
    </ActionPanel>
  )
}

type LanguageActionItemProps = {
  language: Language
  onFilter: (filter: Filter) => void
}

function LanguageActionItem({ language, onFilter }: LanguageActionItemProps): JSX.Element {
  return (
    <ActionPanel.Item
      title={ language.displayName }
      icon={ languageURL(language.name) }
      onAction={ () => onFilter(language.name) }
    />
  )
}