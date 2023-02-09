import { Color, List } from '@raycast/api'
import type { Highlight } from './useApi'

const dateFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeStyle: 'short',
  dateStyle: 'short',
  timeZone: 'UTC',
})

const getColor = (color: string) => {
  switch (color) {
    case 'yellow':
      return Color.Yellow
    case 'green':
      return Color.Green
    case 'blue':
      return Color.Blue
    default:
      return Color.PrimaryText
  }
}

type HighlightDetailsProps = {
  highlight: Highlight
  syncDate?: string
}

export default function HighlightDetails({
  highlight,
  syncDate,
}: HighlightDetailsProps) {
  return (
    <List.Item.Detail
      markdown={
        highlight.note
          ? `${highlight.text}

---

**Note:** ${highlight.note}
`
          : highlight.text
      }
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Updated"
            text={dateFormatter.format(new Date(highlight.updated))}
          />
          <List.Item.Detail.Metadata.Label
            title="Location"
            text={highlight.location.toString()}
          />
          {highlight.color ? (
            <List.Item.Detail.Metadata.Label
              title="Color"
              text={{
                value: '•',
                color: getColor(highlight.color),
              }}
            />
          ) : null}
          {syncDate ? (
            <List.Item.Detail.Metadata.Label
              title="Synced"
              text={dateFormatter.format(new Date(syncDate))}
            />
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  )
}
