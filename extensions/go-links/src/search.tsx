import {Action, ActionPanel, Icon, List} from "@raycast/api"
import {useLocalStorage} from "@raycast/utils"
import {useState} from "react"

import {deleteLink} from "~/links"
import type {Link} from "~/types"

const Command = () => {
    const {
        value: links,
        setValue: setLinks,
        isLoading,
    } = useLocalStorage<Link[]>("go-links", [])

    const [searchText, setSearchText] = useState("")

    return (
        <List
            isLoading={isLoading}
            searchText={searchText}
            onSearchTextChange={setSearchText}
            searchBarPlaceholder="Search go links..."
            filtering
        >
            {links
                ? links
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(link => (
                          <List.Item
                              key={link.id}
                              title={link.name}
                              accessories={[{text: link.description}]}
                              actions={
                                  <ActionPanel>
                                      <Action.OpenInBrowser
                                          title="Open"
                                          url={link.url}
                                      />

                                      <Action.CopyToClipboard
                                          title="Copy"
                                          content={link.url}
                                      />

                                      <Action
                                          title="Delete"
                                          icon={Icon.Trash}
                                          shortcut={{
                                              modifiers: ["cmd"],
                                              key: ".",
                                          }}
                                          onAction={() => {
                                              const newLinks = deleteLink(
                                                  links,
                                                  link.id,
                                              )

                                              setLinks(newLinks)
                                          }}
                                      />
                                  </ActionPanel>
                              }
                          />
                      ))
                : null}
        </List>
    )
}

export default Command
