import { 
  ActionPanel, 
  Image, 
  ImageMask, 
  OpenInBrowserAction, 
  randomId 
} from "@raycast/api"

import { 
  Author
} from "@models"

import { 
  avatarURL,
  checkIsValidURL 
} from "@urls"

export function AuthorsActionPanel({ authors }: { authors: Author[] }): JSX.Element {
  const count = authors.length
  const suffix = count > 1 ? "s" : ""
  const totalDescription = `Author${suffix}`

  return (
    <ActionPanel.Section title={ totalDescription }>
      {authors.map(author => (
        <AuthorActionItem 
          key={ author.url ?? randomId() } 
          author={ author } 
        />
      ))}
    </ActionPanel.Section>
  )
}

function AuthorActionItem({ author }: { author: Author }): JSX.Element {
  let name = author.name ?? "Raycast"
  let url = author.url

  if (url == undefined || url == "") {
    return (
      <ActionPanel.Item 
        title={ name }
        icon={ avatarImage() }
      />
    )
  }

  if (
    url != undefined && url.length > 0 && 
    (url.startsWith("http") == false || url.startsWith("https") == false)
  ) {
    // As every url gives support at least to http, we are prepending http:// to the url.
    // This is an arbitrary decision.
    url = `http://${url}`
  }

  if (checkIsValidURL(url)) {
    const path = new URL(url)

    if (path.host == "twitter.com")
      name = `${name} (Twitter)`
    else if (path.host == "github.com")
      name = `${name} (GitHub)`

    return <OpenInBrowserAction
      title={ name }
      icon={ avatarImage(url) }
      url={ url }
    />
  }
  else {
    return <ActionPanel.Item 
      title={ name }
      icon={ avatarImage() }
    />
  }
}

const avatarImage = (url: string | null = null): Image => {
  return { 
    source: avatarURL(url),
    mask: ImageMask.Circle 
  }
}
