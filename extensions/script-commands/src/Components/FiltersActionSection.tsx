import { ActionPanel, Color, Icon } from "@raycast/api"
import { Filter, State } from "@types"


type FiltersActionPanelProps = {
  onFilter: (filter: Filter) => void
}

export function FiltersActionPanel({ onFilter }: FiltersActionPanelProps): JSX.Element {
  return (
    <ActionPanel title="Filter Script Commands by">
      <ActionPanel.Submenu 
        title="Type" 
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
          onAction={ 
            () => {
              onFilter(State.Installed)
            } 
          }
          />
        <ActionPanel.Item 
          title="Need Setup"
          icon={{ 
            source: Icon.Gear, 
            tintColor: Color.Orange
          }}
          onAction={ () => onFilter("Need Setup") }
        />
      </ActionPanel.Submenu>
      <ActionPanel.Submenu 
        title="Languages" 
        shortcut={{ 
          modifiers: ["cmd"], 
          key: "l" 
        }}
        >
        <ActionPanel.Item 
          title="Swift"
          icon={{ 
            source: Icon.Checkmark, 
            tintColor: Color.Green
          }}
          onAction={ () => onFilter("Swift") }
          />
        <ActionPanel.Item 
          title="Bash"
          icon={{ 
            source: Icon.Gear, 
            tintColor: Color.Orange
          }}
          onAction={ () => onFilter("Bash") }
        />
      </ActionPanel.Submenu>     
  </ActionPanel>
  )
}