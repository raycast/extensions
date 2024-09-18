import { Action, ActionPanel, Grid, Icon } from '@raycast/api'
import { randomColors } from './utils'

type OptionProps = {
  options: { name: string; definition: string }[]
  onOptionChange: (newValue: unknown) => void
}

function OptionsDropdown(props: OptionProps) {
  const { options, onOptionChange } = props
  return (
    <Grid.Dropdown
      tooltip="Select Color Type"
      storeValue={true}
      onChange={(newValue) => {
        onOptionChange(newValue)
      }}
    >
      <Grid.Dropdown.Section title="Color Types">
        {options.map((drinkType) => (
          <Grid.Dropdown.Item key={drinkType.name} title={drinkType.definition} value={drinkType.name} />
        ))}
      </Grid.Dropdown.Section>
    </Grid.Dropdown>
  )
}

export default function Command() {
  const colors = randomColors()

  const options = [
    { name: 'pastel', definition: 'Pastel' },
    { name: 'random', definition: 'Random (coming soon)' },
    { name: 'saturated', definition: 'Saturated (coming soon)' },
  ]

  const onOptionChange = (newValue: unknown) => {
    console.log(newValue)
  }

  return (
    <Grid
      filtering={false}
      navigationTitle="Pick a Color"
      searchBarPlaceholder="Search for a Color"
      searchBarAccessory={<OptionsDropdown options={options} onOptionChange={onOptionChange} />}
    >
      {colors.map((color) => {
        return (
          <Grid.Item
            title={color}
            key={color}
            content={{ color: { light: color, dark: color, adjustContrast: false } }}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy to Clipboard" content={color} />
                <Action.Paste icon={Icon.EyeDropper} title="Paste to Current App" content={color} />
              </ActionPanel>
            }
          />
        )
      })}
    </Grid>
  )
}
