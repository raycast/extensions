import { Clipboard, Detail, LaunchProps, PopToRootType, Toast, getPreferenceValues, popToRoot, showHUD, showToast } from "@raycast/api";
import axios from "axios";
import { useEffect } from "react";

type ShortenedURLResponse = {
  shortLink: string
}

export default function CreateShortURL(
  props: LaunchProps<{ arguments: { url: string; } }>,
): JSX.Element {

  const { projectSlug, baseURL, apiKey } = getPreferenceValues()

  const getURL = () => {
    return `${baseURL}/links?projectSlug=${projectSlug}`
  }

  const shortenURL = () => {

    try {

      // just here to validate the url really
      new URL(props.arguments.url)


      axios.post<ShortenedURLResponse>(getURL(), {
        url: props.arguments.url,
      }, {
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      }).then(res => {

        Clipboard.copy(res.data.shortLink)

        showHUD("Copied URL to your clipboard", {
          clearRootSearch: true,
          popToRootType: PopToRootType.Immediate,
        })

      }).catch(err => {
        showToast({
          style: Toast.Style.Failure,
          title: "An error occurred while generating short URL",
          message: err,
        }).then(() => {
          setTimeout(() => {
            popToRoot({ clearSearchBar: false })
          }, 1000)
        })
      })
    } catch (err) {

      showToast({
        style: Toast.Style.Failure,
        title: "Please provide a valid URL instead",
      }).then(() => {
        setTimeout(() => {
          popToRoot({ clearSearchBar: false })
        }, 1000)
      })
    }

  }

  useEffect(() => {
    shortenURL()
  }, [])


  return <Detail isLoading={true} />
}
