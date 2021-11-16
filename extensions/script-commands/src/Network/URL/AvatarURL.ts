import { 
  Author 
} from "@models"

import { 
  checkIsValidURL 
} from "@urls"


export const authorAvatarURL = (author: Author): string => {
  if (author.url != null && author.url.length > 0 && checkIsValidURL(author.url)) {
    const path = new URL(author.url)

    if (path.host == "twitter.com")
      return `https://unavatar.io/twitter${path.pathname}`

    else if (path.host == "github.com")
      return `${author.url}.png?size=100`
  }

  return "https://github.com/raycast.png?size=100"
}