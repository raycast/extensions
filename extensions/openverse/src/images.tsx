import { useState } from "react"
import { Grid } from "@raycast/api"

import { getLicenseName } from "@/functions/utils"
import { useSearch } from "@/hooks/use-search"

import { ImageActions, NoImageActions } from "@/components/Actions"

/**
 * This is the entrypoint for the "Search Images" command.
 */
export default function Command() {
  const [use, setUse] = useState<Use>("all")
  const handleUseChange = (value: string) => {
    setUse(value as Use)
  }

  const { state, search } = useSearch(use)

  return (
    <Grid
      isLoading={state.isLoading}
      columns={4}
      aspectRatio="4/3"
      fit={Grid.Fit.Fill}
      onSearchTextChange={search}
      searchBarPlaceholder="Search images..."
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Use"
          storeValue={true}
          defaultValue={use}
          onChange={handleUseChange}
        >
          <Grid.Dropdown.Section title="Use">
            <Grid.Dropdown.Item title="All uses" value="all" />
            <Grid.Dropdown.Item title="Use commercially" value="commercial" />
            <Grid.Dropdown.Item title="Modify or adapt" value="modification" />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
      throttle
    >
      <Grid.Section
        title="Top results"
        subtitle={state?.results?.length.toString()}
      >
        {state.results.map((image) => (
          <Grid.Item
            key={image.id}
            id={image.id}
            content={image.url}
            title={image.title}
            subtitle={getLicenseName(image.license)}
            actions={<ImageActions image={image} linkToDetails />}
          />
        ))}
      </Grid.Section>

      <Grid.EmptyView title="No items" actions={<NoImageActions />} />
    </Grid>
  )
}
